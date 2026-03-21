import { FileModel } from "../config/models/File.model";
import { userModel } from "../config/models/User.model";
import { Types } from "mongoose";

export class FileService {
  
  static async saveFile(params: {
    ownerId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    encryptedPath: string;
    encryptedKey: string; // base64
    iv: string;           // base64
    authTag: string;      // base64
  }) {
    const file = await FileModel.create({
      ownerId: new Types.ObjectId(params.ownerId),
      filename: params.filename,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      encryptedPath: params.encryptedPath,
      encryptedKey: params.encryptedKey,
      iv: params.iv,
      authTag: params.authTag,
    });

    await userModel.findByIdAndUpdate(params.ownerId, {
      $inc: { storageUsed: params.size },
    });

    return file;
  }

  static async getUserFiles(userId: string) {
    return FileModel.find({ ownerId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();
  }


  static async getFileById(fileId: string, userId: string) {
    const file = await FileModel.findOne({
      _id: new Types.ObjectId(fileId),
      ownerId: new Types.ObjectId(userId),
    }).lean();
    return file;
  }

  static async deleteFile(fileId: string, userId: string) {
    const file = await FileModel.findOneAndDelete({
      _id: new Types.ObjectId(fileId),
      ownerId: new Types.ObjectId(userId),
    });

    if (!file) return null;

    await userModel.findByIdAndUpdate(userId, {
      $inc: { storageUsed: -file.size },
    });

    return { encryptedPath: file.encryptedPath, size: file.size };
  }


  static async getStorageStats(userId: string) {
    const user = await userModel
      .findById(userId)
      .select("storageUsed storageQuota")
      .lean();
    const fileCount = await FileModel.countDocuments({ ownerId: new Types.ObjectId(userId) });
    return {
      storageUsed: user?.storageUsed ?? 0,
      storageQuota: user?.storageQuota ?? 1_000_000_000,
      fileCount,
    };
  }
}
