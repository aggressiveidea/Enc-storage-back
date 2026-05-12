import { Router } from "express"
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, validateVerifyOTP, validateResendOTP, validateResendVerification } from "../middlewares/validators/validate.middleware"
import { AuthController } from "../controllers/auth.controller"

const router = Router()

router.post("/register", validateRegister, AuthController.Register)
router.post("/login", validateLogin, AuthController.login)
router.post("/forgot-password", validateForgotPassword, AuthController.ForgotPassword)
router.post("/reset-password/:token", validateResetPassword, AuthController.ResetPassword)
router.post("/verify-otp", validateVerifyOTP, AuthController.VerifyOTP)
router.post("/resend-otp", validateResendOTP, AuthController.ResendOTP)
router.get("/verify-email/:token", AuthController.VerifyEmail)
router.post("/resend-verification", validateResendVerification, AuthController.ResendVerification)

export default router