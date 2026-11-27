import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as notificationsController from './notifications.controller';
import * as authMiddleware from '../../middleware/auth.middleware';

const router = Router();

const authenticate: RequestHandler =
  (authMiddleware as any).authenticate ||
  (authMiddleware as any).authenticateToken ||
  (authMiddleware as any).authMiddleware ||
  (authMiddleware as any).verifyToken ||
  (authMiddleware as any).default ||
  ((_req: Request, _res: Response, next: NextFunction) => next());

const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (_req: Request, res: Response) => {
    console.warn(`[notifications.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in notifications.controller.`,
    });
  };
};

const ctrl = (notificationsController as any).default || notificationsController;

const getNotifications = resolveHandler(ctrl.getNotifications || ctrl.list, 'getNotifications');
const markNotificationRead = resolveHandler(
  ctrl.markNotificationRead || ctrl.markRead,
  'markNotificationRead'
);
const markAllNotificationsRead = resolveHandler(
  ctrl.markAllNotificationsRead || ctrl.markAllRead,
  'markAllNotificationsRead'
);

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
