import { Router } from "express"
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from "../middlewares/validators/validate.middleware"
import { AuthController } from "../controllers/auth.controller"

const router = Router()

router.post("/register", validateRegister, AuthController.Register)
router.post("/login", validateLogin, AuthController.login)
router.post("/forgot-password", validateForgotPassword, AuthController.ForgotPassword)
router.post("/reset-password/:token", validateResetPassword, AuthController.ResetPassword)

export default router