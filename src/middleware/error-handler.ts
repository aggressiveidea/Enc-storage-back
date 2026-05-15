import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorResponseUtil } from "../utils/Responses.util";
import { logger } from "../config/logger";
import multer from "multer";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Unhandled error", {
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: "File is too large. Maximum size is 100 MB.",
      LIMIT_FILE_COUNT: "Too many files. Please upload one file at a time.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field. Please check the upload form.",
      LIMIT_FIELD_KEY: "Field name is too long.",
      LIMIT_FIELD_VALUE: "Field value is too long.",
      LIMIT_FIELD_COUNT: "Too many form fields.",
      LIMIT_PART_COUNT: "Too many parts in the upload.",
    };
    const message = messages[err.code] || `Upload failed: ${err.message}`;
    const error = new ErrorResponseUtil().setError(message);
    res.status(StatusCodes.BAD_REQUEST).json(error);
    return;
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(". ");
    const error = new ErrorResponseUtil().setError(
      messages || "Validation failed. Please check your input."
    );
    res.status(StatusCodes.BAD_REQUEST).json(error);
    return;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const error = new ErrorResponseUtil().setError(
      `An account with this ${field} already exists.`
    );
    res.status(StatusCodes.CONFLICT).json(error);
    return;
  }

  if (err.name === "CastError") {
    const error = new ErrorResponseUtil().setError(
      "Invalid identifier format. Please check your request."
    );
    res.status(StatusCodes.BAD_REQUEST).json(error);
    return;
  }

  if (err.type === "entity.parse.failed") {
    const error = new ErrorResponseUtil().setError(
      "Invalid request body. Please check your input format."
    );
    res.status(StatusCodes.BAD_REQUEST).json(error);
    return;
  }

  // Custom AppError handling
  if (err.statusCode) {
    const error = new ErrorResponseUtil().setError(err.message);
    res.status(err.statusCode).json(error);
    return;
  }

  const error = new ErrorResponseUtil().setError(
    "Something went wrong on our end. Please try again or contact support if the issue persists."
  );
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
}
