import { Router } from 'express';
import * as productsController from './products.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// 1. Static and named routes declared BEFORE /:id
router.get('/my-products', authenticate, productsController.getMyProducts);
router.get('/farmer', authenticate, productsController.getMyProducts);

// 2. Public catalog
router.get('/', productsController.getProducts);

// 3. Dynamic item by ID
router.get('/:id', productsController.getProductById);

// 4. Mutations
router.post('/', authenticate, productsController.createProduct);
router.put('/:id', authenticate, productsController.updateProduct);
router.patch('/:id', authenticate, productsController.updateProduct);
router.delete('/:id', authenticate, productsController.deleteProduct);

export default router;