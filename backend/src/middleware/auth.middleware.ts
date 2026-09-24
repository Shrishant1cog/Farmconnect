import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const env = process.env as Record<string, string | undefined>;

const JWT_SECRETS: string[] = [
  env.JWT_SECRET,
  'farmconnect-secret-key',
  'farmconnect-secret-key-development',
].filter(Boolean) as string[];

export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
}

/**
 * Core Authentication Middleware
 * Resolves JWT from Authorization header, cookies, or custom headers
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if ((req as any).cookies && ((req as any).cookies.token || (req as any).cookies.fc_token || (req as any).cookies.farmconnect_token)) {
    token = (req as any).cookies.token || (req as any).cookies.fc_token || (req as any).cookies.farmconnect_token;
  } else {
    const customHeader = (req.headers as Record<string, any>)['x-auth-token'];
    if (typeof customHeader === 'string') {
      token = customHeader;
    }
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
      // Continue to next secret key fallback
    }
  }

  if (!decodedUser) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
    });
  }

  // Normalize user payload on request object
  req.user = decodedUser;
  if (!req.user.id && req.user.userId) {
    req.user.id = req.user.userId;
  }
  req.userId = req.user.id;

  next();
};

/**
 * Role Authorization Middleware Factory
 * Supports both array and spread parameters: requireRole('FARMER') or requireRole(['CONSUMER', 'FARMER'])
 */
export const requireRole = (...allowedRoles: (string | string[])[]) => {
  const normalizedAllowed = allowedRoles
    .flat()
    .map((r) => String(r).toUpperCase());

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      authenticate(req, res, () => {
        const userRole = (req.user?.role || '').toUpperCase();
        if (!normalizedAllowed.includes(userRole)) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Requires one of the following roles: [${normalizedAllowed.join(', ')}]`,
          });
        }
        next();
      });
      return;
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of the following roles: [${normalizedAllowed.join(', ')}]`,
      });
    }

    next();
  };
};

// Aliases for seamless compatibility across routes and controllers
export const authenticateToken = authenticate;
export const authMiddleware = authenticate;
export const verifyToken = authenticate;
export const protect = authenticate;
export const requireAuth = authenticate;
export const authorize = requireRole;

export default authenticate;