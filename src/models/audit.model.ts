import { Schema, model } from "mongoose";

const AuditSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId },
    resourceName: { type: String },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Audit = model("Audit", AuditSchema);
