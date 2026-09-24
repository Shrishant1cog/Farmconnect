import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';
import {
  getPlatformMetrics,
  listAllUsers,
  toggleUserStatus,
  listComplaints,
  resolveComplaint,
} from './admin.controller';

const router = Router();

// Lock down all admin routes to authenticated ADMIN roles
router.use(authenticateToken, requireRole(['ADMIN']));

// Platform health and stats
router.get('/metrics', getPlatformMetrics);

// User moderation
router.get('/users', listAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Dispute and complaint resolution
router.get('/complaints', listComplaints);
router.patch('/complaints/:id/resolve', resolveComplaint);

export default router;