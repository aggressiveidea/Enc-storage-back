import { Request, Response } from "express"
import fs from "fs"
import path from "path"
import { FileService } from "../services/file.service"
import { ErrorResponseUtil, SuccessResponseUtil } from "../utils/Responses.util"
import { StatusCodes } from "http-status-codes"

const ENCRYPTED_DIR = path.join(process.cwd(), "public", "encrypted")

// ensure storage directory exists
if (!fs.existsSync(ENCRYPTED_DIR)) {
  fs.mkdirSync(ENCRYPTED_DIR, { recursive: true })
}

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      const error = new ErrorResponseUtil().setError("No file was provided. Please select a file to upload.")
      res.status(StatusCodes.BAD_REQUEST).json(error)
      return
    }

    const { encryptedKey, iv, authTag } = req.body
    if (!encryptedKey || !iv || !authTag) {
      const error = new ErrorResponseUtil().setError(
        "Encryption data is missing. Please ensure the file is properly encrypted before uploading."
      )
      res.status(StatusCodes.BAD_REQUEST).json(error)
      return
    }

    const user = req.user!

    if (user.storageUsed + req.file.size > user.storageQuota) {
      const usedMB = (user.storageUsed / 1_000_000).toFixed(1)
      const quotaMB = (user.storageQuota / 1_000_000).toFixed(1)
      const fileMB = (req.file.size / 1_000_000).toFixed(1)
      const error = new ErrorResponseUtil().setError(
        `Not enough storage space. You're using ${usedMB} MB of ${quotaMB} MB, and this file is ${fileMB} MB. Please free up space or upgrade your storage.`
      )
      res.status(StatusCodes.REQUEST_TOO_LONG).json(error)
      return
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const filename = `${uniqueId}.enc`
    const encryptedPath = path.join(ENCRYPTED_DIR, filename)

    try {
      fs.writeFileSync(encryptedPath, req.file.buffer)
    } catch (diskErr) {
      console.error("Failed to write file to disk:", diskErr)
      const error = new ErrorResponseUtil().setError(
        "Failed to save your file. Please try again or contact support if the issue persists."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
      return
    }

    const fileRecord = await FileService.saveFile({
      ownerId: user.id,
      filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedPath,
      encryptedKey,
      iv,
      authTag,
    })

    const stats = await FileService.getStorageStats(user.id)

    const response = new SuccessResponseUtil({
      message: "File uploaded and encrypted successfully.",
      data: {
        file: {
          id: (fileRecord as any)._id,
          originalName: fileRecord.originalName,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          createdAt: (fileRecord as any).createdAt,
        },
        storageUsed: stats.storageUsed,
      },
    })
    res.status(StatusCodes.CREATED).json(response)
  } catch (err: any) {
    console.error("Upload error:", err)
    const error = new ErrorResponseUtil().setError(
      "Something went wrong while uploading your file. Please try again."
    )
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

export const getFiles = async (req: Request, res: Response) => {
  try {
    const files = await FileService.getUserFiles(req.user!.id)
    const stats = await FileService.getStorageStats(req.user!.id)

    const response = new SuccessResponseUtil({
      message: "Your files have been loaded.",
      data: {
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
      },
    })
    res.status(StatusCodes.OK).json(response)
  } catch (err) {
    console.error("Get files error:", err)
    const error = new ErrorResponseUtil().setError(
      "Unable to load your files right now. Please refresh the page to try again."
    )
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

export const downloadFile = async (req: Request, res: Response) => {
  try {
    const fileRecord = await FileService.getFileById(String(req.params.id), req.user!.id)

    if (!fileRecord) {
      const error = new ErrorResponseUtil().setError(
        "File not found. It may have been deleted or you may not have permission to access it."
      )
      res.status(StatusCodes.NOT_FOUND).json(error)
      return
    }

    const resolvedPath = path.join(ENCRYPTED_DIR, fileRecord.filename)

    if (!fs.existsSync(resolvedPath)) {
      console.error(`File record exists but disk file is missing: ${resolvedPath}`)
      const error = new ErrorResponseUtil().setError(
        "This file's data could not be found on storage. It may have been corrupted or removed. Please delete it and re-upload."
      )
      res.status(StatusCodes.NOT_FOUND).json(error)
      return
    }

    const encryptedBytes = fs.readFileSync(resolvedPath)

    res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`
    )
    res.setHeader("Content-Length", encryptedBytes.length.toString())
    res.setHeader("Access-Control-Expose-Headers", "x-encrypted-key, x-iv, x-auth-tag")
    res.setHeader("x-encrypted-key", fileRecord.encryptedKey)
    res.setHeader("x-iv", fileRecord.iv)
    res.setHeader("x-auth-tag", fileRecord.authTag)

    res.end(encryptedBytes)
  } catch (err) {
    console.error("Download error:", err)
    const error = new ErrorResponseUtil().setError(
      "Unable to download this file right now. Please try again."
    )
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const result = await FileService.deleteFile(String(req.params.id), req.user!.id)

    if (!result) {
      const error = new ErrorResponseUtil().setError(
        "File not found or you don't have permission to delete it."
      )
      res.status(StatusCodes.NOT_FOUND).json(error)
      return
    }

    const resolvedPath = path.join(ENCRYPTED_DIR, result.filename)
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath)
      } catch (diskErr) {
        console.error("Failed to delete file from disk:", diskErr)
      }
    }

    const stats = await FileService.getStorageStats(req.user!.id)

    const response = new SuccessResponseUtil({
      message: "File deleted successfully.",
      data: { storageUsed: stats.storageUsed },
    })
    res.status(StatusCodes.OK).json(response)
  } catch (err) {
    console.error("Delete error:", err)
    const error = new ErrorResponseUtil().setError(
      "Unable to delete this file right now. Please try again."
    )
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await FileService.getStorageStats(req.user!.id)
    const response = new SuccessResponseUtil({
      message: "Storage stats loaded.",
      data: { stats },
    })
    res.status(StatusCodes.OK).json(response)
  } catch (err) {
    console.error("Get stats error:", err)
    const error = new ErrorResponseUtil().setError(
      "Unable to load storage stats right now."
    )
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

export const getGlobalFiles = async (req: Request, res: Response) => {
  try {
    const files = await FileService.getAllGlobalFiles()
    const stats = await FileService.getGlobalStats()

    const response = new SuccessResponseUtil({
      message: "Global file registry loaded.",
      data: {
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
      },
    })
    res.status(StatusCodes.OK).json(response)
  } catch (err) {
    console.error("Get global files error:", err)
    const error = new ErrorResponseUtil().setError(
      "Unable to load the global file registry right now."
    )
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}
