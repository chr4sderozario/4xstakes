import { io, Socket } from 'socket.io-client';

// Connect to current origin
export const socket: Socket = io(window.location.origin, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});
