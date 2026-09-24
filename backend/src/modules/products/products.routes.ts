import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
} from './products.controller';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', authenticateToken, requireRole(['FARMER']), createProduct);
router.put('/:id', authenticateToken, requireRole(['FARMER']), updateProduct);
router.patch('/:id', authenticateToken, requireRole(['FARMER']), patchProduct);
router.delete('/:id', authenticateToken, requireRole(['FARMER']), deleteProduct);

export default router;