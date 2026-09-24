import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getFarmerOrders,
  updateOrderStatus,
  confirmOrderDelivery,
} from './orders.controller';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';
import { orderLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Allow both Consumers and Farmers to buy
router.post('/', orderLimiter, authenticateToken, requireRole(['CONSUMER', 'FARMER']), createOrder);
router.get('/my', authenticateToken, requireRole(['CONSUMER', 'FARMER']), getMyOrders);

// Cultivator dispatch management
router.get('/farmer', authenticateToken, requireRole(['FARMER']), getFarmerOrders);
router.patch('/:id/status', authenticateToken, requireRole(['FARMER']), updateOrderStatus);

// Confirm receipt
router.patch('/:id/received', authenticateToken, requireRole(['CONSUMER', 'FARMER']), confirmOrderDelivery);

export default router;