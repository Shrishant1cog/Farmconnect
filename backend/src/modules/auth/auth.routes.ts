import { Router } from 'express';
import {
  register,
  login,
  loginPhone,
  verifyAadhaar,
  firebasePhoneAuth,
  getCurrentUser,
} from './auth.controller';

const router = Router();

// Registration & Standard Login
router.post('/register', register);
router.post('/login', login);

// Mobile OTP Endpoints
router.post('/login-phone', loginPhone);
router.post('/phone-login', loginPhone);
router.post('/firebase-phone', firebasePhoneAuth);

// Identity Verification & Profile
router.post('/verify-aadhaar', verifyAadhaar);
router.get('/me', getCurrentUser);

export default router;