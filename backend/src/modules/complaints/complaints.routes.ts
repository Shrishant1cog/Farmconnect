import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as complaintsController from './complaints.controller';
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
    console.warn(`[complaints.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in complaints.controller.`,
    });
  };
};

const ctrl = (complaintsController as any).default || complaintsController;

const createComplaint = resolveHandler(ctrl.createComplaint || ctrl.create, 'createComplaint');
const getMyComplaints = resolveHandler(ctrl.getMyComplaints || ctrl.mine, 'getMyComplaints');

router.use(authenticate);

router.get('/mine', getMyComplaints);
router.post('/', createComplaint);

export default router;
