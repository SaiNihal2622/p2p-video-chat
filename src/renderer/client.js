// WebRTC client — getUserMedia + RTCPeerConnection + offer/answer/ICE over the
// signaling WebSocket. Media flows P2P; the server only relays signaling.
// State is managed via the Zustand store (store.js). Supports camera + screen-share.
import { useCallStore } from './store.js';

const localVideo = document.getElementById('local');
const remoteVideo = document.getElementById('remote');
const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const joinBtn = document.getElementById('join');
const camBtn = document.getElementById('startCam');
const shareBtn = document.getElementById('shareScreen');
const hangupBtn = document.getElementById('hangup');

let ws = null;
let pc = null;
let localStream = null;
let screenStream = null;
let roomId = null;
let isOfferer = false;

const store = useCallStore;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.textContent += line + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

// --- Signaling over WebSocket ---
function connectSignaling() {
  ws = new WebSocket(`ws://localhost:8080`);
  ws.onopen = () => {
    log('Signaling connected');
    ws.send(JSON.stringify({ type: 'join', roomId }));
    store.getState().setWsConnected(true);
    store.getState().setStatus('Joined room: ' + roomId, true);
  };
  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    log('Signal: ' + msg.type);
    switch (msg.type) {
      case 'room-info':
        store.getState().setPeerCount(msg.count);
        store.getState().setStatus(`In room "${roomId}" (${msg.count} peer${msg.count > 1 ? 's' : ''})`, true);
        break;
      case 'offer':
        await handleOffer(msg);
        break;
      case 'answer':
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        log('Remote answer set');
        break;
      case 'ice-candidate':
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        break;
    }
  };
  ws.onclose = () => { log('Signaling closed'); store.getState().setWsConnected(false); store.getState().setStatus('Disconnected'); };
}

// --- Media capture (camera + mic) ---
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  store.getState().setLocalStream(localStream);
  camBtn.disabled = true;
  shareBtn.disabled = false;
  log('Local camera + mic acquired');
}

// --- Screen share (getDisplayMedia) — adds a screen track to the call ---
async function startScreenShare() {
  if (!pc) { log('Join a call first'); return; }
  screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const screenTrack = screenStream.getVideoTracks()[0];
  pc.addTrack(screenTrack, screenStream);
  store.getState().setScreenSharing(true);
  shareBtn.textContent = 'Stop Share';
  log('Screen share track added to call');
  screenTrack.onended = () => {
    store.getState().setScreenSharing(false);
    shareBtn.textContent = 'Share Screen';
    log('Screen share ended');
  };
}

// --- Peer connection ---
function createPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  });
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate, roomId }));
    }
  };
  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
    store.getState().setRemoteStream(e.streams[0]);
    log('Remote media track received');
  };
  pc.onconnectionstatechange = () => {
    store.getState().setConnectionState(pc.connectionState);
    log('Connection state: ' + pc.connectionState);
    if (pc.connectionState === 'connected') store.getState().setStatus('Connected (P2P)', true);
  };
}

// --- Offerer (first peer in room) ---
async function createOffer() {
  isOfferer = true;
  createPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription, roomId }));
  log('Offer sent');
}

// --- Answerer (second peer) ---
async function handleOffer(msg) {
  isOfferer = false;
  createPeerConnection();
  await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription, roomId }));
  log('Answer sent');
}

function hangup() {
  if (pc) { pc.close(); pc = null; }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  if (screenStream) { screenStream.getTracks().forEach((t) => t.stop()); screenStream = null; }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  camBtn.disabled = false;
  shareBtn.disabled = true;
  shareBtn.textContent = 'Share Screen';
  hangupBtn.disabled = true;
  store.getState().setStatus('Idle');
  log('Call ended');
}

// --- Wire up UI ---
joinBtn.onclick = () => {
  roomId = document.getElementById('room').value.trim() || 'demo-room';
  store.getState().setRoom(roomId);
  connectSignaling();
  joinBtn.disabled = true;
  camBtn.disabled = false;
};
camBtn.onclick = async () => {
  await startCamera();
  hangupBtn.disabled = false;
  // First peer in the room initiates the offer.
  setTimeout(() => { if (!isOfferer) createOffer(); }, 500);
};
shareBtn.onclick = startScreenShare;
hangupBtn.onclick = hangup;
