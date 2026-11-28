import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as catalogController from './catalog.controller';

const router = Router();

const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (_req: Request, res: Response) => {
    console.warn(`[catalog.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in catalog.controller.`,
    });
  };
};

const ctrl = (catalogController as any).default || catalogController;

const listCategories = resolveHandler(ctrl.listCategories || ctrl.categories, 'listCategories');
const listCrops = resolveHandler(ctrl.listCrops || ctrl.crops, 'listCrops');

// Static routes are declared before any parameterised route.
router.get('/categories', listCategories);
router.get('/crops', listCrops);

export default router;
