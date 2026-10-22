# P2P Video Chat — Electron + WebRTC

A cross-platform **desktop P2P video chat** app built with **Electron** and **WebRTC**.
Media flows **directly peer-to-peer** via `RTCPeerConnection` — the signaling server
only relays offer/answer/ICE messages over WebSocket, never audio or video.

## Why this project
Demonstrates the full WebRTC + desktop stack:
- **`getUserMedia`** — capture local camera + microphone
- **`getDisplayMedia`** — screen sharing (adds a screen track to the live call)
- **`RTCPeerConnection`** — direct P2P media with STUN-based NAT traversal
- **Offer / Answer / ICE** — full signaling handshake over a WebSocket server
- **Zustand** — centralized call-state management (room, connection, media, UI)
- **Electron desktop shell** — context-isolated renderer, preload bridge, CSP
- **Cross-platform builds** — Windows (NSIS/portable), macOS (DMG), Linux (AppImage/deb)
- **No cloud media relay** — the server is signaling-only (privacy-first design)

## Architecture
```
┌────────────┐   offer/answer/ICE   ┌──────────────────┐   offer/answer/ICE   ┌────────────┐
│  Peer A    │◄────────────────────►│  Signaling (ws) │◄────────────────────►│  Peer B    │
│ (Electron) │                       │  (signaling-    │                       │ (Electron) │
│            │◄═══════════════════════════════════════════════════════════════►│            │
└────────────┘        direct P2P media (RTCPeerConnection)                    └────────────┘
```

## Run it
```bash
npm install
# Terminal 1 — signaling server
npm run server
# Terminal 2 — desktop app (open two instances, same room ID)
npm start
```

## Build installers (cross-platform)
```bash
npm run dist:win    # Windows NSIS + portable
npm run dist:mac    # macOS DMG
npm run dist:linux  # Linux AppImage + deb
```

## Files
- `src/main.js` — Electron main process (window, lifecycle)
- `src/preload.js` — context-isolated bridge
- `src/signaling-server.js` — WebSocket signaling server (Node `ws`)
- `src/renderer/client.js` — WebRTC client (getUserMedia, getDisplayMedia, RTCPeerConnection, ICE)
- `src/renderer/store.js` — Zustand call-state store
- `src/renderer/index.html` / `style.css` — UI
- `electron-builder.yml` — cross-platform packaging config

## Stack
Electron · WebRTC (RTCPeerConnection, getUserMedia, getDisplayMedia) · Zustand · WebSocket (`ws`) · Node.js · JavaScript
