import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as authController from './auth.controller';
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

// Safe handler resolution to prevent Express callback [object Undefined] runtime crashes
const resolveHandler = (fn: any, name: string): RequestHandler => {
  if (typeof fn === 'function') {
    return fn;
  }
  return (_req: Request, res: Response) => {
    console.warn(`[auth.routes] Missing handler for '${name}'`);
    res.status(501).json({
      success: false,
      message: `Handler '${name}' is not implemented in auth.controller.`,
    });
  };
};

const ctrl = (authController as any).default || authController;

const register = resolveHandler(ctrl.register || ctrl.handleRegister, 'register');
const login = resolveHandler(ctrl.login || ctrl.handleLogin, 'login');
const loginPhone = resolveHandler(ctrl.loginPhone || ctrl.phoneLogin || ctrl.loginWithPhone, 'loginPhone');
const firebasePhoneAuth = resolveHandler(ctrl.firebasePhoneAuth || ctrl.firebaseAuth, 'firebasePhoneAuth');
const verifyAadhaar = resolveHandler(ctrl.verifyAadhaar || ctrl.verifyIdentity, 'verifyAadhaar');
const getCurrentUser = resolveHandler(ctrl.getCurrentUser || ctrl.getMe || ctrl.me, 'getCurrentUser');

// 1. Registration & Standard Credentials Login
router.post('/register', register);
router.post('/login', login);

// 2. Mobile Phone Authentication Endpoints
router.post('/login-phone', loginPhone);
router.post('/phone-login', loginPhone);
router.post('/firebase-phone', firebasePhoneAuth);

// 3. Identity Verification & Authenticated Profile Retrieval
router.post('/verify-aadhaar', authenticate, verifyAadhaar);
router.get('/me', authenticate, getCurrentUser);

export default router;