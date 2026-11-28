import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { JWT_SECRETS } from '../config/jwt';

export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
}

/**
 * Core Authentication Middleware
 * Resolves JWT from Authorization header, cookies, or custom headers
 *
 * A valid signature is **not** enough to open a session: the account has to
 * exist in the shared database and has to be active. The token only proves
 * that the key belongs to this service — the database proves that the
 * person is still allowed to act.
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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

  const sessionUserId = decodedUser.id || decodedUser.userId;
  if (!sessionUserId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: The session carries no account.',
    });
  }

  // The account has to exist and has to be active. Without this check a
  // token of a deleted account — and of a **suspended** account — kept
  // working for the whole lifetime of the token, which made the
  // administrator's "suspend account" action ineffective.
  let account: any = null;
  try {
    account = await db.user.findUnique({
      where: { id: String(sessionUserId) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        preferredLanguage: true,
      },
    });
  } catch (dbError: any) {
    console.error('[Auth] The account could not be verified:', dbError?.message || dbError);
    return res.status(503).json({
      success: false,
      message: 'The session could not be verified right now. Please try again.',
    });
  }

  if (!account) {
    return res.status(401).json({
      success: false,
      message: 'Your session is no longer valid. Please sign in again.',
    });
  }

  if (account.isActive === false) {
    return res.status(401).json({
      success: false,
      message: 'This account has been suspended. Please contact the administrator.',
    });
  }

  // Normalize user payload on request object.
  //
  // The **live database row** is authoritative: the role and the status are
  // read from the database, never from the (possibly stale) token.
  req.user = {
    ...decodedUser,
    ...account,
    id: account.id,
    role: account.role,
  };
  req.userId = account.id;

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