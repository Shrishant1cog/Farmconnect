import { Router } from 'express';
import { register, login, verifyAadhaar } from './auth.controller';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-aadhaar', authLimiter, authenticateToken, requireRole(['FARMER']), verifyAadhaar);

export default router;