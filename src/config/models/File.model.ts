import { Schema, model, Types } from "mongoose";
import { File } from "../../types/globals";

const FileSchema = new Schema<File>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: "application/octet-stream",
    },
    size: {
      type: Number,
      required: true,
    },
    encryptedPath: {
      type: String,
      required: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const FileModel = model<File>("file", FileSchema);