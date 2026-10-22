// Zustand store — centralizes call state (room, connection, media, UI status).
// Keeps the WebRTC logic decoupled from the DOM and makes state testable.
import { create } from 'zustand';

export const useCallStore = create((set, get) => ({
  // Connection state
  roomId: null,
  wsConnected: false,
  peerCount: 0,
  connectionState: 'new', // new | connecting | connected | disconnected | failed

  // Media state
  localStream: null,
  remoteStream: null,
  screenSharing: false,

  // UI state
  status: 'Idle',
  statusActive: false,

  // Actions
  setRoom: (roomId) => set({ roomId }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setPeerCount: (peerCount) => set({ peerCount }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setScreenSharing: (screenSharing) => set({ screenSharing }),
  setStatus: (status, statusActive = false) => set({ status, statusActive }),

  // Derived: is the P2P link actually up?
  isConnected: () => get().connectionState === 'connected',
}));
