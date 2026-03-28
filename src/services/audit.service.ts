import { Audit, IAudit } from "../config/models/Audit.model";
import { Types } from "mongoose";

export class AuditService {
  static async log(data: {
    user: string | Types.ObjectId;
    action: string;
    resourceId?: string | Types.ObjectId;
    resourceName?: string;
    status: "SUCCESS" | "FAILURE";
    metadata?: Record<string, any>;
  }) {
    try {
      return await Audit.create(data);
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  }

  static async getUserLogs(userId: string | Types.ObjectId, limit: number = 20) {
    return await Audit.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async getSystemStats() {
    // Anonymized stats for the security center
    const totalEvents = await Audit.countDocuments();
    const latestEvents = await Audit.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("action status createdAt -_id");
    
    return {
      totalEvents,
      latestEvents,
    };
  }
}
