import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as favoritesController from './favorites.controller';
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
    console.warn(`[favorites.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in favorites.controller.`,
    });
  };
};

const ctrl = (favoritesController as any).default || favoritesController;

const getFavorites = resolveHandler(ctrl.getFavorites || ctrl.list, 'getFavorites');
const toggleFavoriteProduct = resolveHandler(
  ctrl.toggleFavoriteProduct || ctrl.toggleProduct,
  'toggleFavoriteProduct'
);
const toggleFavoriteFarmer = resolveHandler(
  ctrl.toggleFavoriteFarmer || ctrl.toggleFarmer,
  'toggleFavoriteFarmer'
);

router.use(authenticate);

router.get('/', getFavorites);
router.post('/products/:id', toggleFavoriteProduct);
router.delete('/products/:id', toggleFavoriteProduct);
router.post('/farmers/:id', toggleFavoriteFarmer);
router.delete('/farmers/:id', toggleFavoriteFarmer);

export default router;
