import { Router } from 'express';
import { getCurrentProfile, updateCurrentProfile } from './users.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/me', getCurrentProfile);
router.patch('/me', updateCurrentProfile);

export default router;