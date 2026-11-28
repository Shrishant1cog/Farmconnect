import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { JWT_SECRETS } from '../config/jwt';
import * as handlersModule from './handlers';

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
  ioInstance.use(async (socket: AuthenticatedSocket, next) => {
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

    if (!decodedUser) {
      return next(new Error('Unauthorized: Invalid or expired session token'));
    }

    const sessionUserId = decodedUser.id || decodedUser.userId;
    if (!sessionUserId) {
      return next(new Error('Unauthorized: The session carries no account.'));
    }

    // The account has to exist and has to be active, exactly like on the
    // HTTP routes — otherwise a deleted or suspended account could still
    // receive its notifications through the real-time channel.
    let account: any = null;
    try {
      account = await db.user.findUnique({
        where: { id: String(sessionUserId) },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      });
    } catch (dbError: any) {
      console.error('[Socket] The account could not be verified:', dbError?.message || dbError);
      return next(new Error('The session could not be verified right now.'));
    }

    if (!account) {
      return next(new Error('Unauthorized: This account no longer exists.'));
    }

    if (account.isActive === false) {
      return next(new Error('Unauthorized: This account has been suspended.'));
    }

    socket.data.user = {
      ...decodedUser,
      ...account,
      id: account.id,
      role: (account.role || '').toUpperCase(),
    };
    return next();
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