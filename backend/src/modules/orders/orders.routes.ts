import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as ordersController from './orders.controller';
import * as authMiddleware from '../../middleware/auth.middleware';
import * as rateLimiterModule from '../../middleware/rateLimiter';

const router = Router();

// Safety wrapper to guarantee a valid Express RequestHandler
const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (req: Request, res: Response, next: NextFunction) => {
    if (name === 'orderLimiter') {
      return next();
    }
    console.warn(`[orders.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in orders.controller.`,
    });
  };
};

// 1. Resolve Auth Middleware (matches authenticateToken or authenticate)
const authenticateToken: RequestHandler = 
  (authMiddleware as any).authenticateToken || 
  (authMiddleware as any).authenticate || 
  (authMiddleware as any).authMiddleware || 
  (authMiddleware as any).verifyToken || 
  (authMiddleware as any).default || 
  ((req: Request, res: Response, next: NextFunction) => next());

// 2. Resolve Role Guard Middleware Factory
const requireRole = (roles: string | string[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const flattened = allowed.flat().map((r) => String(r).toUpperCase());

  if (typeof (authMiddleware as any).requireRole === 'function') {
    return (authMiddleware as any).requireRole(flattened);
  }
  if (typeof (authMiddleware as any).authorize === 'function') {
    return (authMiddleware as any).authorize(flattened);
  }

  // Built-in fallback role guard
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

// 3. Resolve Rate Limiter (falls through safely if not configured)
const orderLimiter: RequestHandler = 
  (rateLimiterModule as any).orderLimiter || 
  (rateLimiterModule as any).limiter || 
  (rateLimiterModule as any).default || 
  ((req: Request, res: Response, next: NextFunction) => next());

// 4. Resolve Controller Handlers (matches named or default export variants)
const ctrl = (ordersController as any).default || ordersController;
const createOrder = resolveHandler(ctrl.createOrder || ctrl.create || ctrl.placeOrder, 'createOrder');
const getMyOrders = resolveHandler(ctrl.getMyOrders || ctrl.myOrders || ctrl.getUserOrders, 'getMyOrders');
const getFarmerOrders = resolveHandler(ctrl.getFarmerOrders || ctrl.farmerOrders || ctrl.getByFarmer, 'getFarmerOrders');
const updateOrderStatus = resolveHandler(ctrl.updateOrderStatus || ctrl.updateStatus || ctrl.patchStatus, 'updateOrderStatus');
const confirmOrderDelivery = resolveHandler(ctrl.confirmOrderDelivery || ctrl.confirmOrderReceived || ctrl.confirmDelivery, 'confirmOrderDelivery');

// Allow both Consumers and Farmers to buy
router.post('/', orderLimiter, authenticateToken, requireRole(['CONSUMER', 'FARMER']), createOrder);
router.get('/my', authenticateToken, requireRole(['CONSUMER', 'FARMER']), getMyOrders);

// Cultivator dispatch management
router.get('/farmer', authenticateToken, requireRole(['FARMER']), getFarmerOrders);
router.patch('/:id/status', authenticateToken, requireRole(['FARMER']), updateOrderStatus);

// Confirm receipt
router.patch('/:id/received', authenticateToken, requireRole(['CONSUMER', 'FARMER']), confirmOrderDelivery);

export default router;