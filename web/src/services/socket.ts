import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL =
  (import.meta as ImportMeta & { env?: { VITE_SOCKET_URL?: string } }).env?.VITE_SOCKET_URL ??
  'http://localhost:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      autoConnect: true,
      transports: ['websocket'],
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};