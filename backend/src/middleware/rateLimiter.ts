import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Standardized error response contract
const rateLimitResponse = (message: string, retryAfterSeconds?: number) => ({
  success: false,
  code: 'RATE_LIMIT_EXCEEDED',
  message,
  ...(retryAfterSeconds ? { retryAfter: `${retryAfterSeconds}s` } : {}),
});

// Bypass rate limits during automated testing to prevent false 429 failures
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * 1. Global Baseline Limiter: Protects general read/write API endpoints
 * 600 requests per 15 minutes per IP (relaxed in development)
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  handler: (_req: Request, res: Response) => {
    return res.status(429).json(
      rateLimitResponse('Too many requests from this IP. Please try again later.')
    );
  },
});

/**
 * 2. Strict Auth & Verification Limiter: Protects login, registration, and OTP verification
 * 60 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: () => isTestEnv,
  handler: (_req: Request, res: Response) => {
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
 * 120 actions per 5 minutes per IP
 */
export const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isTestEnv ? 10000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  handler: (_req: Request, res: Response) => {
    return res.status(429).json(
      rateLimitResponse('High transaction frequency detected. Please slow down and try again.')
    );
  },
});

// Compatibility aliases
export const rateLimiter = globalLimiter;
export const limiter = globalLimiter;

export default {
  globalLimiter,
  authLimiter,
  orderLimiter,
  rateLimiter,
  limiter,
};