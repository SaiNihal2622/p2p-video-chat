// WebRTC client — getUserMedia + RTCPeerConnection + offer/answer/ICE over the
// signaling WebSocket. Media flows P2P; the server only relays signaling.
const localVideo = document.getElementById('local');
const remoteVideo = document.getElementById('remote');
const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const joinBtn = document.getElementById('join');
const camBtn = document.getElementById('startCam');
const hangupBtn = document.getElementById('hangup');

let ws = null;
let pc = null;
let localStream = null;
let roomId = null;
let joined = false;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.textContent += line + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}
function setStatus(text, active = false) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (active ? ' active' : '');
}

// --- Signaling over WebSocket ---
function connectSignaling() {
  ws = new WebSocket(`ws://localhost:8080`);
  ws.onopen = () => {
    log('Signaling connected');
    ws.send(JSON.stringify({ type: 'join', roomId }));
    setStatus('Joined room: ' + roomId, true);
  };
  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    log('Signal: ' + msg.type);
    switch (msg.type) {
      case 'room-info':
        setStatus(`In room "${roomId}" (${msg.count} peer${msg.count > 1 ? 's' : ''})`, true);
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
  ws.onclose = () => { log('Signaling closed'); setStatus('Disconnected'); };
}

// --- Media capture ---
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  camBtn.disabled = true;
  log('Local camera + mic acquired');
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
    log('Remote media track received');
  };
  pc.onconnectionstatechange = () => {
    log('Connection state: ' + pc.connectionState);
    if (pc.connectionState === 'connected') setStatus('Connected (P2P)', true);
  };
}

// --- Offerer (first peer in room) ---
async function createOffer() {
  createPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription, roomId }));
  log('Offer sent');
}

// --- Answerer (second peer) ---
async function handleOffer(msg) {
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
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  camBtn.disabled = false;
  hangupBtn.disabled = true;
  setStatus('Idle');
  log('Call ended');
}

// --- Wire up UI ---
joinBtn.onclick = () => {
  roomId = document.getElementById('room').value.trim() || 'demo-room';
  connectSignaling();
  joinBtn.disabled = true;
  camBtn.disabled = false;
};
camBtn.onclick = async () => {
  await startCamera();
  hangupBtn.disabled = false;
  // First peer in the room initiates the offer.
  setTimeout(() => { if (joined === false) { joined = true; createOffer(); } }, 500);
};
hangupBtn.onclick = hangup;
