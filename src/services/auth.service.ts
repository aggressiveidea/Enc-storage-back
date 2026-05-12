import { userModel } from "../config/models/User.model"
import { bcryptUtil } from "../utils/bcrypt.utils"
import { JwtUtil } from "../utils/jwt.utils"
import crypto from "crypto"
import { EmailService } from "./email.service"

export class AuthService {
  static async Login(email: string, password: string) {
    const user = await userModel.findOne({ email })
    if (!user) {
      return null
    }

    const isPasswordCorrect = await bcryptUtil.compare(password, user.password)
    if (!isPasswordCorrect) {
      return null
    }

    if (!user.isEmailVerified) {
      return {
        requiresVerification: true,
        email: user.email,
      }
    }

    const otpCode = crypto.randomInt(100000, 999999).toString()
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    await userModel.findByIdAndUpdate(user.id, {
      otpCode,
      otpExpires,
    })

    await EmailService.sendOTPEmail(user.email, otpCode)

    const tempToken = await JwtUtil.createTempToken(user.id, "otp")

    return {
      requiresOTP: true,
      tempToken,
      email: user.email,
    }
  }

  static async VerifyOTP(email: string, otp: string, tempToken: string) {
    const tempPayload = await JwtUtil.verifyTempToken(tempToken, "otp")
    if (!tempPayload) {
      return { success: false, message: "Invalid or expired session. Please log in again." }
    }

    const user = await userModel.findOne({ email })
    if (!user) {
      return { success: false, message: "User not found." }
    }

    if (user.id.toString() !== (tempPayload as any).id) {
      return { success: false, message: "Token mismatch. Please log in again." }
    }

    if (!user.otpCode || !user.otpExpires) {
      return { success: false, message: "No OTP was requested. Please log in again." }
    }

    if (new Date() > user.otpExpires) {
      await userModel.findByIdAndUpdate(user.id, {
        otpCode: undefined,
        otpExpires: undefined,
      })
      return { success: false, message: "OTP has expired. Please request a new one." }
    }

    if (user.otpCode !== otp) {
      return { success: false, message: "Invalid OTP code." }
    }

    await userModel.findByIdAndUpdate(user.id, {
      otpCode: undefined,
      otpExpires: undefined,
    })

    const authToken = await JwtUtil.createToken(user.id)
    return {
      success: true,
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          publicKey: user.publicKey,
          encryptedPrivateKey: user.encryptedPrivateKey,
          storageUsed: user.storageUsed,
          storageQuota: user.storageQuota,
        },
      },
    }
  }

  static async ResendOTP(email: string, tempToken: string) {
    const tempPayload = await JwtUtil.verifyTempToken(tempToken, "otp")
    if (!tempPayload) {
      return { success: false, message: "Invalid or expired session. Please log in again." }
    }

    const user = await userModel.findOne({ email })
    if (!user) {
      return { success: false, message: "User not found." }
    }

    if (user.id.toString() !== (tempPayload as any).id) {
      return { success: false, message: "Token mismatch. Please log in again." }
    }

    const otpCode = crypto.randomInt(100000, 999999).toString()
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000)

    await userModel.findByIdAndUpdate(user.id, {
      otpCode,
      otpExpires,
    })

    await EmailService.sendOTPEmail(user.email, otpCode)

    const newTempToken = await JwtUtil.createTempToken(user.id, "otp")

    return {
      success: true,
      tempToken: newTempToken,
      message: "A new OTP has been sent to your email.",
    }
  }

  static async RegisterUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string,
    publicKey: string,
    encryptedPrivateKey: string,
  ) {
    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
      return null
    }
    const hashedPass = await bcryptUtil.hash(password)

    const verificationToken = crypto.randomBytes(32).toString("hex")
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const user = await userModel.create({
      email,
      password: hashedPass,
      firstName,
      lastName,
      role,
      publicKey,
      encryptedPrivateKey,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    })

    if (!user) {
      return null
    }

    const frontUrl = process.env.FRONT_URL || "http://localhost:5173"
    const verificationLink = `${frontUrl}/verify-email/${verificationToken}`
    await EmailService.sendVerificationEmail(user.email, verificationLink)

    return {
      success: true,
      message: "Account created. Please check your email to verify your address.",
      email: user.email,
    }
  }

  static async RequestPasswordReset(email: string) {
    const user = await userModel.findOne({ email })
    if (!user) {
      return { success: true, message: "If an account with that email exists, a reset link has been sent." }
    }

    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await userModel.findByIdAndUpdate(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry,
    })
    const frontUrl = process.env.FRONT_URL || "http://localhost:5173";
    const resetLink = `${frontUrl}/reset-password/${resetToken}`;
    await EmailService.sendPasswordResetEmail(user.email, resetLink);

    return {
      success: true,
      message: "If an account with that email exists, a reset link has been sent."
    }
  }

  static async ResetPassword(token: string, newPassword: string) {
    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      return { success: false, message: "Invalid or expired reset token" }
    }

    const hashedPassword = await bcryptUtil.hash(newPassword)

    await userModel.findByIdAndUpdate(user.id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    })

    return { success: true, message: "Password has been reset successfully" }
  }

  static async ValidateResetToken(token: string) {
    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      return { valid: false, message: "Invalid or expired reset token" }
    }

    return {
      valid: true,
      user: {
        email: user.email,
        firstName: user.firstName,
      },
    }
  }

  static async VerifyEmail(token: string) {
    const user = await userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    })

    if (!user) {
      return { success: false, message: "Invalid or expired verification link. Please request a new one." }
    }

    await userModel.findByIdAndUpdate(user.id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    })

    return { success: true, message: "Email verified successfully. You can now log in." }
  }

  static async ResendVerificationEmail(email: string) {
    const user = await userModel.findOne({ email })

    if (!user) {
      return { success: true, message: "If an account with that email exists, a verification link has been sent." }
    }

    if (user.isEmailVerified) {
      return { success: true, message: "This email is already verified. You can log in." }
    }

    const verificationToken = crypto.randomBytes(32).toString("hex")
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await userModel.findByIdAndUpdate(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    })

    const frontUrl = process.env.FRONT_URL || "http://localhost:5173"
    const verificationLink = `${frontUrl}/verify-email/${verificationToken}`
    await EmailService.sendVerificationEmail(user.email, verificationLink)

    return { success: true, message: "A new verification link has been sent to your email." }
  }
}