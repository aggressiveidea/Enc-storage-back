import { JwtUtil } from "../../utils/jwt.utils"
import { userModel } from "../../config/models/User.model"
import { StatusCodes } from "http-status-codes"
import { ErrorResponseUtil } from "../../utils/Responses.util"
import type { Request, Response, NextFunction } from "express"
import type { AuthUser } from "../../types/globals"

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export class authMiddleware {
  /**
   * @description a middleware to check if the user is authenticated
   */
  static async checkAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers["authorization"]

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const error = new ErrorResponseUtil().setError("token wasn't provided or malformed")
        res.status(StatusCodes.UNAUTHORIZED).json(error)
        return
      }

      const token = authHeader.split(" ")[1]
      const data = await JwtUtil.verifyToken(token)

      if (!data || !data.id) {
        const error = new ErrorResponseUtil().setError("The provided token is invalid")
        res.status(StatusCodes.UNAUTHORIZED).json(error)
        return
      }

      const user = await userModel.findById(data.id)

      if (!user) {
        const error = new ErrorResponseUtil().setError("The provided token is invalid")
        res.status(StatusCodes.UNAUTHORIZED).json(error)
        return
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        publicKey: user.publicKey,
        storageUsed: user.storageUsed ?? 0,
        storageQuota: user.storageQuota ?? 1000000000,
      }

      next()
    } catch (error) {
      console.error("auth error:", error)
      const errorResponse = new ErrorResponseUtil().setError("authentication error")
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }

  /**
   * @description middleware to check if user is admin
   */
  static async checkAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      await authMiddleware.checkAuth(req, res, () => {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
          const error = new ErrorResponseUtil().setError("admin access required")
          res.status(StatusCodes.FORBIDDEN).json(error)
          return
        }
        next()
      })
    } catch (error) {
      console.error("access error:", error)
      const errorResponse = new ErrorResponseUtil().setError("authentication error")
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }

  /**
   * @description middleware to check if user is super_admin
   */
  static async checkSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      await authMiddleware.checkAuth(req, res, () => {
        if (!req.user || req.user.role !== "super_admin") {
          const error = new ErrorResponseUtil().setError("super admin access required")
          res.status(StatusCodes.FORBIDDEN).json(error)
          return
        }
        next()
      })
    } catch (error) {
      console.error("access error:", error)
      const errorResponse = new ErrorResponseUtil().setError("authentication error")
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }
}