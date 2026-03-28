import { Request, Response } from "express";
import { AuditService } from "../services/audit.service";
import { StatusCodes } from "http-status-codes";
import { SuccessResponseUtil } from "../utils/Responses.util";
import { userModel } from "../config/models/User.model";

export class AuditController {
  static async getLogs(req: Request, res: Response) {
    try {
      const logs = await AuditService.getUserLogs(req.user!.id);
      const response = new SuccessResponseUtil({
        message: "Audit logs retrieved",
        data: logs,
      });
      return res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async getSecurityCenterStats(req: Request, res: Response) {
    try {
      const stats = await AuditService.getSystemStats();
      
      // Also get public key directory (anonymized/basic info)
      const users = await userModel.find().select("email publicKey createdAt -_id").lean();
      
      const response = new SuccessResponseUtil({
        message: "Security center stats retrieved",
        data: {
          ...stats,
          userRegistry: users
        },
      });
      return res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
