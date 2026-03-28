import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/validators/auth.middleware";
import {uploadFile,getFiles,downloadFile,deleteFile,getStats,getGlobalFiles} from "../controllers/file.controller";

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

const router = Router();

router.use(authMiddleware.checkAuth);

router.post("/upload", upload.single("file"), uploadFile);
router.get("/global", authMiddleware.checkSuperAdmin, getGlobalFiles);
router.get("/", getFiles);
router.post("/download/:id", downloadFile); 
router.delete("/:id", deleteFile);
router.get("/stats", getStats);

export default router;