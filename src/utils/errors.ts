import { StatusCodes } from "http-status-codes";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, StatusCodes.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, StatusCodes.CONFLICT);
  }
}
