import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Standardized error response contract
const rateLimitResponse = (message: string, retryAfterSeconds?: number) => ({
  success: false,
  code: 'RATE_LIMIT_EXCEEDED',
  message,
  ...(retryAfterSeconds ? { retryAfter: `${retryAfterSeconds}s` } : {}),
});

/**
 * 1. Global Baseline Limiter: Protects general read/write API endpoints
 * 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    return res.status(429).json(
      rateLimitResponse('Too many requests from this IP. Please try again later.')
    );
  },
});

/**
 * 2. Strict Auth & Verification Limiter: Protects login, registration, and verification
 * 10 attempts per 15 minutes per IP to stop credential brute-forcing
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json(
      rateLimitResponse(
        'Too many authentication attempts. Your IP has been temporarily throttled for 15 minutes.',
        15 * 60
      )
    );
  },
});

/**
 * 3. Sensitive Action Limiter: Protects order creation and chat initiation
 * 30 actions per 5 minutes per IP
 */
export const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json(
      rateLimitResponse('High transaction frequency detected. Please slow down and try again.')
    );
  },
});

// Backward-compatible alias for existing imports
export const rateLimiter = globalLimiter;