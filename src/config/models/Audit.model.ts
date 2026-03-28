import { Schema, model, Document, Types } from "mongoose";

export interface IAudit extends Document {
  user: Types.ObjectId;
  action: string;
  resourceId?: Types.ObjectId;
  resourceName?: string;
  status: "SUCCESS" | "FAILURE";
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditSchema = new Schema<IAudit>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId },
    resourceName: { type: String },
    status: { type: String, enum: ["SUCCESS", "FAILURE"], default: "SUCCESS" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Audit = model<IAudit>("Audit", AuditSchema);
