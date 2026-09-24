import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'FARMER' | 'CONSUMER' | 'ADMIN';

// Harmonize secret fallback across controller and middleware
const RESOLVED_JWT_SECRET =
  (env && (env as any).JWT_SECRET) ||
  process.env.JWT_SECRET ||
  'farmconnect-secret-key';

export interface JwtUserPayload extends JwtPayload {
  id: string;
  role: UserRole;
  email?: string;
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

/**
 * Validates incoming Bearer JWT tokens with synchronized secret resolution
 * and support for phone-first authentication (optional email).
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_HEADER_MISSING',
      message: 'Access token missing or improperly formatted (expected: Bearer <token>)',
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EMPTY',
      message: 'Authentication token is empty',
    });
  }

  try {
    const decoded = jwt.verify(token, RESOLVED_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JwtUserPayload;

    // Validate payload: id and role are required; phone or email must be present
    if (!decoded.id || !decoded.role || (!decoded.email && !decoded.phone)) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID_PAYLOAD',
        message: 'Token claims are malformed or missing required user attributes',
      });
    }

    req.user = decoded;
    return next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Please refresh your session.',
      });
    }

    if (err instanceof JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MALFORMED',
        message: 'Access token signature is invalid or has been tampered with.',
      });
    }

    return res.status(500).json({
      success: false,
      code: 'AUTH_INTERNAL_ERROR',
      message: 'Internal authorization validation failure.',
    });
  }
};

/**
 * Enforces role-based access control (RBAC). Rejects unauthorized roles with 403 Forbidden.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required prior to permission validation',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Forbidden: this action requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    return next();
  };
};