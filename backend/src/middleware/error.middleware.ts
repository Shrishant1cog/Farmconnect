import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export function errorMiddleware(
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code || 'OPERATIONAL_ERROR',
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError || error?.name === 'ZodError') {
    const formattedErrors = (error.issues || []).map((issue: any) => ({
      field: Array.isArray(issue.path) ? issue.path.join('.') : 'field',
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Request payload validation failed',
      errors: formattedErrors,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError || error?.name === 'PrismaClientKnownRequestError') {
    switch (error.code) {
      case 'P2002': {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : (error.meta?.target as string) || 'field';
        res.status(409).json({
          success: false,
          code: 'DUPLICATE_RESOURCE',
          message: `A record with this ${target} already exists.`,
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          code: 'RESOURCE_NOT_FOUND',
          message: 'The requested record was not found or has already been removed.',
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          success: false,
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Invalid relational reference: target dependency does not exist.',
        });
        return;
      }
      default: {
        res.status(400).json({
          success: false,
          code: `DB_QUERY_ERROR_${error.code || 'UNKNOWN'}`,
          message: 'Database operation failed. Please verify submitted parameters.',
        });
        return;
      }
    }
  }

  if (error instanceof TokenExpiredError || error?.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Session token has expired. Please sign in again.',
    });
    return;
  }

  if (error instanceof JsonWebTokenError || error?.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_INVALID',
      message: 'Access token is malformed or invalid.',
    });
    return;
  }

  if (error?.type === 'entity.parse.failed' || (error instanceof SyntaxError && 'body' in error)) {
    res.status(400).json({
      success: false,
      code: 'MALFORMED_JSON',
      message: 'Invalid JSON syntax provided in request body.',
    });
    return;
  }

  console.error('[Unhandled Server Exception]:', error);

  const rawEnv = process.env as Record<string, string | undefined>;
  const isProduction = rawEnv.NODE_ENV === 'production';

  res.status(error.status || error.statusCode || 500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: isProduction
      ? 'An unexpected internal server error occurred. Please try again later.'
      : error.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: error.stack }),
  });
}

export const errorHandler = errorMiddleware;
export default errorMiddleware;