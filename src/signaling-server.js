// Signaling server — WebSocket-based. Coordinates WebRTC offer/answer/ICE exchange
// between peers. Media flows P2P directly (RTCPeerConnection); the server only
// relays signaling messages, never audio/video.
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('P2P Video Chat signaling server\n');
});

const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomId -> Set<ws>

function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  ws.roomId = roomId;
  // Tell the new peer how many others are already in the room.
  const count = rooms.get(roomId).size;
  ws.send(JSON.stringify({ type: 'room-info', count }));
}

function relay(ws, msg) {
  const peers = rooms.get(ws.roomId);
  if (!peers) return;
  for (const peer of peers) {
    if (peer !== ws && peer.readyState === 1) {
      peer.send(JSON.stringify(msg));
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    switch (msg.type) {
      case 'join': joinRoom(ws, msg.roomId); break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        relay(ws, msg); break;
      default: break;
    }
  });
  ws.on('close', () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
      if (rooms.get(ws.roomId).size === 0) rooms.delete(ws.roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on ws://localhost:${PORT}`);
});
