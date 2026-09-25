import { Server } from 'socket.io';
import { env } from './env.js';

export const createIO = (httpServer) => {
  const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  return new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    maxHttpBufferSize: 1e6,
    pingInterval: 25000,
    pingTimeout: 20000,
  });
};