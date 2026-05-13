import { Request, Response } from "express"
import { AuditService } from "../services/audit.service"
import { StatusCodes } from "http-status-codes"
import { SuccessResponseUtil, ErrorResponseUtil } from "../utils/Responses.util"
import { userModel } from "../config/models/User.model"

export class AuditController {
  static async getLogs(req: Request, res: Response) {
    try {
      const logs = await AuditService.getUserLogs(req.user!.id)
      const response = new SuccessResponseUtil({
        message: "Audit logs loaded.",
        data: logs,
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Get audit logs error:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to load audit logs right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }

  static async getSecurityCenterStats(req: Request, res: Response) {
    try {
      const stats = await AuditService.getSystemStats()
      const users = await userModel.find().select("email publicKey createdAt -_id").lean()

      const response = new SuccessResponseUtil({
        message: "Security center stats loaded.",
        data: {
          ...stats,
          userRegistry: users,
        },
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Get security stats error:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to load security center stats right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }
}
