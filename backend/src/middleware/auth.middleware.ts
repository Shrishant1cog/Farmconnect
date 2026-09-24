import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRETS = [
  process.env.JWT_SECRET,
  'farmconnect-secret-key',
  'farmconnect-secret-key-development',
].filter(Boolean) as string[];

export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if ((req as any).cookies && ((req as any).cookies.token || (req as any).cookies.fc_token || (req as any).cookies.farmconnect_token)) {
    token = (req as any).cookies.token || (req as any).cookies.fc_token || (req as any).cookies.farmconnect_token;
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'] as string;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided.',
    });
  }

  let decodedUser: any = null;
  for (const secret of JWT_SECRETS) {
    try {
      decodedUser = jwt.verify(token, secret);
      if (decodedUser) break;
    } catch {
      // Try next secret key fallback
    }
  }

  if (!decodedUser) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
    });
  }

  // Normalize user payload on the request object
  req.user = decodedUser;
  if (!req.user.id && req.user.userId) {
    req.user.id = req.user.userId;
  }
  req.userId = req.user.id;

  next();
};

export const authMiddleware = authenticate;
export const verifyToken = authenticate;
export const protect = authenticate;
export const requireAuth = authenticate;

export default authenticate;