import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { encryptFile } from "../utils/encryptFile";
import { decryptFile } from "../utils/decryptFile";
import { FileService } from "../services/file.service";

const ENCRYPTED_DIR = path.join(process.cwd(), "public", "encrypted");

// ensure storage directory exists
if (!fs.existsSync(ENCRYPTED_DIR)) {
  fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });
}

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const user = req.user!;
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const size = req.file.size;

    if (user.storageUsed + size > user.storageQuota) {
      return res.status(413).json({ success: false, error: "Storage quota exceeded" });
    }

    const { encryptedFile, encryptedKey, iv, authTag } = encryptFile(fileBuffer, user.publicKey);

    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${uniqueId}.enc`;
    const encryptedPath = path.join(ENCRYPTED_DIR, filename);
    fs.writeFileSync(encryptedPath, encryptedFile);

    const fileRecord = await FileService.saveFile({
      ownerId: user.id,
      filename,
      originalName,
      mimeType,
      size,
      encryptedPath,
      encryptedKey: encryptedKey.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
    });

    return res.status(201).json({
      success: true,
      message: "File encrypted and stored successfully",
      file: {
        id: fileRecord._id,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        createdAt: fileRecord.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ success: false, error: "Failed to upload and encrypt file" });
  }
};


export const getFiles = async (req: Request, res: Response) => {
  try {
    const files = await FileService.getUserFiles(req.user!.id);
    const stats = await FileService.getStorageStats(req.user!.id);

    return res.json({
      success: true,
      files: files.map((f: any) => ({
        id: f._id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        createdAt: f.createdAt,
      })),
      stats,
    });
  } catch (error) {
    console.error("Get files error:", error);
    return res.status(500).json({ success: false, error: "Failed to retrieve files" });
  }
};


export const downloadFile = async (req: Request, res: Response) => {
  try {
    const fileRecord = await FileService.getFileById(String(req.params.id), req.user!.id);

    if (!fileRecord) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const privateKey = req.body?.privateKey as string;
    if (!privateKey) {
      return res.status(400).json({ success: false, error: "Private key required for decryption" });
    }

    if (!fs.existsSync(fileRecord.encryptedPath)) {
      return res.status(404).json({ success: false, error: "Encrypted file not found on disk" });
    }

    const encryptedBytes = fs.readFileSync(fileRecord.encryptedPath);
    const iv = Buffer.from(fileRecord.iv, "base64");
    const authTag = Buffer.from(fileRecord.authTag, "base64");
    const encryptedKey = Buffer.from(fileRecord.encryptedKey, "base64");

    let decrypted: Buffer;
    try {
      decrypted = decryptFile(encryptedBytes, authTag, iv, encryptedKey, privateKey);
    } catch (decryptErr) {
      return res.status(422).json({ success: false, error: "Decryption failed — wrong key or corrupted file" });
    }

    res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
    res.setHeader("Content-Length", decrypted.length.toString());
    return res.end(decrypted);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ success: false, error: "Failed to download file" });
  }
};


export const deleteFile = async (req: Request, res: Response) => {
  try {
    const result = await FileService.deleteFile(String(req.params.id), req.user!.id);

    if (!result) {
      return res.status(404).json({ success: false, error: "File not found or not owned by you" });
    }

   
    if (fs.existsSync(result.encryptedPath)) {
      fs.unlinkSync(result.encryptedPath);
    }

    return res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ success: false, error: "Failed to delete file" });
  }
};


export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await FileService.getStorageStats(req.user!.id);
    return res.json({ success: true, stats });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to get stats" });
  }
};