import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants';
import { getToken } from './api';

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket> => {
  if (!socket || !socket.connected) {
    const token = await getToken();
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
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
