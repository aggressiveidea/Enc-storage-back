import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { FileService } from "../services/file.service";
import { AuditService } from "../services/audit.service";

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

    const { encryptedKey, iv, authTag } = req.body;
    if (!encryptedKey || !iv || !authTag) {
      return res.status(400).json({ success: false, error: "Encryption metadata (key, iv, authTag) is required" });
    }

    const user = req.user!;
    const encryptedFileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const size = req.file.size;

    if (user.storageUsed + size > user.storageQuota) {
      return res.status(413).json({ success: false, error: "Storage quota exceeded" });
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${uniqueId}.enc`;
    const encryptedPath = path.join(ENCRYPTED_DIR, filename);
    fs.writeFileSync(encryptedPath, encryptedFileBuffer);

    const fileRecord = await FileService.saveFile({
      ownerId: user.id,
      filename,
      originalName,
      mimeType,
      size,
      encryptedPath,
      encryptedKey,
      iv,
      authTag,
    });

    /*
    await AuditService.log({
      user: user.id,
      action: "UPLOAD",
      resourceId: (fileRecord._id as any).toString(),
      resourceName: fileRecord.originalName,
      status: "SUCCESS",
      metadata: { size: fileRecord.size, mimeType: fileRecord.mimeType }
    });
    */

    const stats = await FileService.getStorageStats(user.id);
    return res.status(201).json({
      success: true,
      message: "Encrypted file stored successfully",
      file: {
        id: fileRecord._id,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        createdAt: fileRecord.createdAt,
      },
      storageUsed: stats.storageUsed,
    });
  } catch (error: any) {
    console.error("UPLOAD CONTROLLER ERROR:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to store encrypted file" });
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
        encryptedKey: f.encryptedKey,
        iv: f.iv,
        authTag: f.authTag,
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
    console.log("=== DOWNLOAD DEBUG ===")
    console.log("Requested ID:", req.params.id)
    console.log("User ID:", req.user!.id)
    
    const fileRecord = await FileService.getFileById(String(req.params.id), req.user!.id)
    console.log("File record found:", fileRecord ? "YES" : "NO")
    
    if (!fileRecord) {
      console.log("File not found — either wrong ID or wrong owner")
      return res.status(404).json({ success: false, error: "File not found" })
    }

    const resolvedPath = path.join(ENCRYPTED_DIR, fileRecord.filename)
    console.log("Resolved path:", resolvedPath)
    console.log("File exists on disk:", fs.existsSync(resolvedPath))

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, error: "Encrypted file not found on disk" });
    }

    const encryptedBytes = fs.readFileSync(resolvedPath);

    res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
    res.setHeader("Content-Length", encryptedBytes.length.toString());
    res.setHeader("Access-Control-Expose-Headers", "x-encrypted-key, x-iv, x-auth-tag");
    res.setHeader("x-encrypted-key", fileRecord.encryptedKey);
    res.setHeader("x-iv", fileRecord.iv);
    res.setHeader("x-auth-tag", fileRecord.authTag);

    return res.end(encryptedBytes);
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

    const resolvedPath = path.join(ENCRYPTED_DIR, result.filename);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    const stats = await FileService.getStorageStats(req.user!.id);
    return res.json({ success: true, message: "File deleted successfully", storageUsed: stats.storageUsed });
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

export const getGlobalFiles = async (req: Request, res: Response) => {
  try {
    const files = await FileService.getAllGlobalFiles();
    const stats = await FileService.getGlobalStats();

    return res.json({
      success: true,
     files: files.map((f: any) => ({
     id: f._id.toString(),  
     originalName: f.originalName,
     mimeType: f.mimeType,
     size: f.size,
     createdAt: f.createdAt,
     encryptedKey: f.encryptedKey,
     iv: f.iv,
     authTag: f.authTag,  
   })),
      stats,
    });
  } catch (error) {
    console.error("Get global files error:", error);
    return res.status(500).json({ success: false, error: "Failed to retrieve global files" });
  }
};