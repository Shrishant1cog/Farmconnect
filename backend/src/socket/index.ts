import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { registerSocketHandlers } from './handlers';

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  role: 'FARMER' | 'CONSUMER' | 'ADMIN';
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: AuthenticatedSocketUser;
  };
}

let ioInstance: SocketIOServer | null = null;

export const initSocket = (server: HttpServer, clientUrl: string | string[]): SocketIOServer => {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: clientUrl,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for WebSocket handshakes
  ioInstance.use((socket: AuthenticatedSocket, next) => {
    const rawToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!rawToken) {
      // Allow guest connections for public real-time price tickers
      return next();
    }

    try {
      const decoded = jwt.verify(rawToken, env.JWT_SECRET) as AuthenticatedSocketUser;
      socket.data.user = decoded;
      next();
    } catch {
      // Token is invalid or expired; reject the socket connection
      next(new Error('Unauthorized: Invalid or expired session token'));
    }
  });

  ioInstance.on('connection', (socket: AuthenticatedSocket) => {
    registerSocketHandlers(ioInstance!, socket);
  });

  return ioInstance;
};

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized. Call initSocket before accessing getIO().');
  }
  return ioInstance;
};