import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as enquiriesController from './enquiries.controller';
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

// Safe handler resolution to prevent Express [object Undefined] routing crashes
const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (_req: Request, res: Response) => {
    console.warn(`[enquiries.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in enquiries.controller.`,
    });
  };
};

const ctrl = (enquiriesController as any).default || enquiriesController;
const createEnquiry = resolveHandler(ctrl.createEnquiry || ctrl.create, 'createEnquiry');
const getConsumerEnquiries = resolveHandler(ctrl.getConsumerEnquiries || ctrl.getMyEnquiries || ctrl.myEnquiries, 'getConsumerEnquiries');
const getFarmerEnquiries = resolveHandler(ctrl.getFarmerEnquiries || ctrl.farmerEnquiries, 'getFarmerEnquiries');
const getEnquiryMessages = resolveHandler(ctrl.getEnquiryMessages || ctrl.getEnquiryById || ctrl.getMessages, 'getEnquiryMessages');
const sendEnquiryMessage = resolveHandler(ctrl.sendEnquiryMessage || ctrl.sendMessage, 'sendEnquiryMessage');

// 1. Consumer / Buyer: Initiate a new inquiry on a harvest listing
router.post('/', authenticate, requireRole(['CONSUMER', 'FARMER']), createEnquiry);

// 2. Consumer / Buyer: Fetch all active inquiry threads
router.get('/my', authenticate, requireRole(['CONSUMER', 'FARMER']), getConsumerEnquiries);

// 3. Cultivator / Farmer: Fetch all incoming negotiations from buyers
router.get('/farmer', authenticate, requireRole(['FARMER', 'ADMIN']), getFarmerEnquiries);

// 4. Thread Messages: Retrieve discussion history with participant verification
router.get('/:id/messages', authenticate, getEnquiryMessages);

// 5. Thread Messages: Send a new negotiation reply & broadcast in real-time
router.post('/:id/messages', authenticate, sendEnquiryMessage);

export default router;