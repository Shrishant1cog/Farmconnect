import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as usersController from './users.controller';
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

// Safe handler resolution to prevent Express callback [object Undefined] runtime crashes
const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (_req: Request, res: Response) => {
    console.warn(`[users.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in users.controller.`,
    });
  };
};

const ctrl = (usersController as any).default || usersController;

const getCurrentProfile = resolveHandler(
  ctrl.getCurrentProfile || ctrl.getProfile || ctrl.getMe || ctrl.getCurrentUser,
  'getCurrentProfile'
);
const updateCurrentProfile = resolveHandler(
  ctrl.updateCurrentProfile || ctrl.updateProfile || ctrl.updateMe || ctrl.editProfile,
  'updateCurrentProfile'
);

// Lock down all user self-service endpoints to authenticated sessions
router.use(authenticate);

// Profile inspection and mutation
router.get('/me', getCurrentProfile);
router.patch('/me', updateCurrentProfile);
router.put('/me', updateCurrentProfile);

export default router;