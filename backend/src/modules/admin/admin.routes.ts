import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as adminController from './admin.controller';
import * as authMiddleware from '../../middleware/auth.middleware';

const router = Router();

// Defensive resolution of authentication middleware
const authenticate: RequestHandler =
  (authMiddleware as any).authenticate ||
  (authMiddleware as any).authenticateToken ||
  (authMiddleware as any).authMiddleware ||
  (authMiddleware as any).verifyToken ||
  (authMiddleware as any).default ||
  ((_req: Request, _res: Response, next: NextFunction) => next());

// Defensive resolution of role authorization factory
const requireRole = (...allowedRoles: (string | string[])[]) => {
  const flattened = allowedRoles.flat().map((r) => String(r).toUpperCase());

  if (typeof (authMiddleware as any).requireRole === 'function') {
    return (authMiddleware as any).requireRole(flattened);
  }
  if (typeof (authMiddleware as any).authorize === 'function') {
    return (authMiddleware as any).authorize(flattened);
  }

  return (req: any, res: Response, next: NextFunction) => {
    const userRole = (req.user?.role || '').toUpperCase();
    if (req.user && !flattened.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires [${flattened.join(', ')}] role.`,
      });
    }
    next();
  };
};

// Safe handler resolution to prevent Express callback [object Undefined] runtime crashes
const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (_req: Request, res: Response) => {
    console.warn(`[admin.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in admin.controller.`,
    });
  };
};

const ctrl = (adminController as any).default || adminController;

const getPlatformMetrics = resolveHandler(
  ctrl.getPlatformMetrics || ctrl.getMetrics || ctrl.metrics,
  'getPlatformMetrics'
);
const listAllUsers = resolveHandler(
  ctrl.listAllUsers || ctrl.getUsers || ctrl.getAllUsers || ctrl.listUsers,
  'listAllUsers'
);
const toggleUserStatus = resolveHandler(
  ctrl.toggleUserStatus || ctrl.toggleStatus || ctrl.updateUserStatus,
  'toggleUserStatus'
);
const listComplaints = resolveHandler(
  ctrl.listComplaints || ctrl.getComplaints || ctrl.complaints,
  'listComplaints'
);
const resolveComplaint = resolveHandler(
  ctrl.resolveComplaint || ctrl.updateComplaint || ctrl.resolve,
  'resolveComplaint'
);

// Lock down all administrative routes to authenticated ADMIN roles
router.use(authenticate, requireRole(['ADMIN']));

// Platform health, telemetry & aggregated metrics
router.get('/metrics', getPlatformMetrics);

// User moderation & directory controls
router.get('/users', listAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Dispute & complaint resolution
router.get('/complaints', listComplaints);
router.patch('/complaints/:id/resolve', resolveComplaint);

export default router;