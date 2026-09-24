import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

/**
 * Custom operational error class for explicit business rule rejections
 */
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
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Application Error Interceptor
 */
export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // 1. Known Operational Errors (Explicitly thrown by business logic)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code || "OPERATIONAL_ERROR",
      message: error.message,
    });
  }

  // 2. Zod Request Body / Query Validation Failures
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Request payload validation failed",
      errors: formattedErrors,
    });
  }

  // 3. Prisma Database Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation (e.g. duplicate email, unique slug)
        const target = (error.meta?.target as string[])?.join(", ") || "field";
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_RESOURCE",
          message: `A record with this ${target} already exists.`,
        });
      }
      case "P2025": {
        // Record not found during update/delete
        return res.status(404).json({
          success: false,
          code: "RESOURCE_NOT_FOUND",
          message: "The requested record was not found or has already been removed.",
        });
      }
      case "P2003": {
        // Foreign key constraint failure
        return res.status(400).json({
          success: false,
          code: "FOREIGN_KEY_VIOLATION",
          message: "Invalid relation reference: target dependency does not exist.",
        });
      }
      default:
        // Other Prisma query errors
        return res.status(400).json({
          success: false,
          code: `DB_QUERY_ERROR_${error.code}`,
          message: "Database operation failed. Please verify submitted parameters.",
        });
    }
  }

  // 4. JWT & Authentication Errors
  if (error instanceof TokenExpiredError) {
    return res.status(401).json({
      success: false,
      code: "AUTH_TOKEN_EXPIRED",
      message: "Session token has expired. Please sign in again.",
    });
  }

  if (error instanceof JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      code: "AUTH_TOKEN_INVALID",
      message: "Access token is malformed or invalid.",
    });
  }

  // 5. Malformed JSON Body (Client sent invalid JSON syntax)
  if ("type" in error && (error as any).type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      code: "MALFORMED_JSON",
      message: "Invalid JSON syntax provided in request body.",
    });
  }

  // 6. Generic / Unhandled Internal Errors (500)
  // Log complete error server-side for diagnostic auditing
  console.error("💥 Unhandled Server Exception:", error);

  const isProduction = process.env.NODE_ENV === "production";

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: isProduction
      ? "An unexpected internal server error occurred. Please try again later."
      : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
  });
}