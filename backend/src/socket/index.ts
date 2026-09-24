import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import * as handlersModule from './handlers';

const rawEnv = process.env as Record<string, string | undefined>;

export interface AuthenticatedSocketUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  [key: string]: any;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: AuthenticatedSocketUser;
  };
}

const JWT_SECRETS: string[] = [
  rawEnv.JWT_SECRET,
  (env as any)?.JWT_SECRET,
  'farmconnect-secret-key',
  'farmconnect-secret-key-development',
].filter(Boolean) as string[];

let ioInstance: SocketIOServer | null = null;

export const initSocket = (server: HttpServer, clientUrl: string | string[]): SocketIOServer => {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: clientUrl,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for WebSocket handshakes
  ioInstance.use((socket: AuthenticatedSocket, next) => {
    const query = socket.handshake.query as Record<string, any>;
    const queryToken = typeof query?.token === 'string' ? query.token : undefined;

    const rawToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      queryToken;

    if (!rawToken) {
      // Allow guest connections for public real-time price feeds
      return next();
    }

    let decodedUser: any = null;
    for (const secret of JWT_SECRETS) {
      try {
        decodedUser = jwt.verify(rawToken, secret);
        if (decodedUser) break;
      } catch {
        // Fall back to next secret
      }
    }

    if (decodedUser) {
      socket.data.user = {
        ...decodedUser,
        id: decodedUser.id || decodedUser.userId,
        role: (decodedUser.role || '').toUpperCase(),
      };
      return next();
    }

    return next(new Error('Unauthorized: Invalid or expired session token'));
  });

  ioInstance.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.data.user?.id;
    if (userId) {
      socket.join(`user_${userId}`);
    }

    const registerHandlers =
      (handlersModule as any).registerSocketHandlers ||
      (handlersModule as any).default ||
      handlersModule;

    if (typeof registerHandlers === 'function') {
      try {
        registerHandlers(ioInstance!, socket);
      } catch (err) {
        console.warn('[Socket Handlers Init Warning]:', err);
      }
    }
  });

  return ioInstance;
};

export const getIO = (): SocketIOServer | null => {
  if (!ioInstance) {
    console.warn('[Socket.IO Notice]: getIO() called before initSocket(). Returning null.');
    return null;
  }
  return ioInstance;
};

export default {
  initSocket,
  getIO,
};