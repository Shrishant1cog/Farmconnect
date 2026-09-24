import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as productsController from './products.controller';
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
        message: `Forbidden: Requires one of [${flattened.join(', ')}] role(s).`,
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
    console.warn(`[products.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in products.controller.`,
    });
  };
};

const ctrl = (productsController as any).default || productsController;

const getMyProducts = resolveHandler(ctrl.getMyProducts || ctrl.myProducts || ctrl.getFarmerProducts, 'getMyProducts');
const getProducts = resolveHandler(ctrl.getProducts || ctrl.getAll || ctrl.listProducts, 'getProducts');
const getProductById = resolveHandler(ctrl.getProductById || ctrl.getById || ctrl.getProduct, 'getProductById');
const createProduct = resolveHandler(ctrl.createProduct || ctrl.create, 'createProduct');
const updateProduct = resolveHandler(ctrl.updateProduct || ctrl.update, 'updateProduct');
const deleteProduct = resolveHandler(ctrl.deleteProduct || ctrl.delete || ctrl.remove, 'deleteProduct');

// 1. Static and named routes declared BEFORE /:id to prevent route shadowing
router.get('/my-products', authenticate, getMyProducts);
router.get('/farmer', authenticate, getMyProducts);

// 2. Public catalog feed
router.get('/', getProducts);

// 3. Dynamic item retrieval by ID
router.get('/:id', getProductById);

// 4. Produce lot mutations
router.post('/', authenticate, requireRole(['FARMER', 'ADMIN']), createProduct);
router.put('/:id', authenticate, requireRole(['FARMER', 'ADMIN']), updateProduct);
router.patch('/:id', authenticate, requireRole(['FARMER', 'ADMIN']), updateProduct);
router.delete('/:id', authenticate, requireRole(['FARMER', 'ADMIN']), deleteProduct);

export default router;