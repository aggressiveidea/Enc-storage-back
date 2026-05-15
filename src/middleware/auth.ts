import { JwtUtil } from "../utils/jwt.utils";
import { userModel } from "../models/user.model";
import { StatusCodes } from "http-status-codes";
import { ErrorResponseUtil } from "../utils/Responses.util";
import type { Request, Response, NextFunction } from "express";

export class authMiddleware {
  static async checkAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers["authorization"];

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const error = new ErrorResponseUtil().setError(
          "Token wasn't provided or malformed"
        );
        res.status(StatusCodes.UNAUTHORIZED).json(error);
        return;
      }

      const token = authHeader.split(" ")[1];
      const data = (await JwtUtil.verifyToken(token)) as { id: string } | null;

      if (!data || !data.id) {
        const error = new ErrorResponseUtil().setError(
          "The provided token is invalid"
        );
        res.status(StatusCodes.UNAUTHORIZED).json(error);
        return;
      }

      const user = await userModel.findById(data.id);

      if (!user) {
        const error = new ErrorResponseUtil().setError(
          "The provided token is invalid"
        );
        res.status(StatusCodes.UNAUTHORIZED).json(error);
        return;
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        publicKey: user.publicKey,
        encryptedPrivateKey: user.encryptedPrivateKey,
        storageUsed: user.storageUsed ?? 0,
        storageQuota: user.storageQuota ?? 1000000000,
      };

      next();
    } catch (error) {
      console.error("auth error:", error);
      const errorResponse = new ErrorResponseUtil().setError(
        "Authentication error"
      );
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async checkAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      await authMiddleware.checkAuth(req, res, () => {
        if (
          !req.user ||
          (req.user.role !== "admin" && req.user.role !== "super_admin")
        ) {
          const error = new ErrorResponseUtil().setError("Admin access required");
          res.status(StatusCodes.FORBIDDEN).json(error);
          return;
        }
        next();
      });
    } catch (error) {
      console.error("access error:", error);
      const errorResponse = new ErrorResponseUtil().setError(
        "Authentication error"
      );
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async checkSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      await authMiddleware.checkAuth(req, res, () => {
        if (!req.user || req.user.role !== "super_admin") {
          const error = new ErrorResponseUtil().setError(
            "Super admin access required"
          );
          res.status(StatusCodes.FORBIDDEN).json(error);
          return;
        }
        next();
      });
    } catch (error) {
      console.error("access error:", error);
      const errorResponse = new ErrorResponseUtil().setError(
        "Authentication error"
      );
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}
