import { Router } from 'express';
import {
  createEnquiry,
  getConsumerEnquiries,
  getFarmerEnquiries,
  getEnquiryMessages,
  sendEnquiryMessage,
} from './enquiries.controller';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Consumer inquiry management
router.post('/', authenticateToken, requireRole(['CONSUMER']), createEnquiry);
router.get('/my', authenticateToken, requireRole(['CONSUMER']), getConsumerEnquiries);

// Farmer inquiry management
router.get('/farmer', authenticateToken, requireRole(['FARMER']), getFarmerEnquiries);

// Chat messages thread & exchange
router.get('/:id/messages', authenticateToken, getEnquiryMessages);
router.post('/:id/messages', authenticateToken, sendEnquiryMessage);

export default router;