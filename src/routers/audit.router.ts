import { Router } from "express";
import { AuditController } from "../controllers/audit.controller";
import { authMiddleware } from "../middlewares/validators/auth.middleware";

const router = Router();

router.use(authMiddleware.checkAuth);

router.get("/logs", AuditController.getLogs);
router.get("/stats", AuditController.getSecurityCenterStats);

export default router;
