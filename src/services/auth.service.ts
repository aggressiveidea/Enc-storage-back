import { userModel } from "../config/models/User.model"
import { FileModel } from "../config/models/File.model"
import { bcryptUtil } from "../utils/bcrypt.utils"
import { JwtUtil } from "../utils/jwt.utils"
import crypto from "crypto"
import fs from "fs"
import path from "path"
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

  static async ResetPassword(
    token: string,
    newPassword: string,
    newPublicKey: string,
    newEncryptedPrivateKey: string,
  ) {
    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      return { success: false, message: "Invalid or expired reset token" }
    }

    const ENCRYPTED_DIR = path.join(process.cwd(), "public", "encrypted")

    // ── Wipe all user files from disk ──
    const userFiles = await FileModel.find({ ownerId: user._id })
    let deletedCount = 0
    for (const file of userFiles) {
      const filePath = path.join(ENCRYPTED_DIR, file.filename)
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (err) {
        console.error(`Failed to delete file ${file.filename} from disk:`, err)
      }
      deletedCount++
    }

    // ── Delete all file records from DB ──
    await FileModel.deleteMany({ ownerId: user._id })

    // ── Update user with new password, new keys, reset storage ──
    const hashedPassword = await bcryptUtil.hash(newPassword)

    await userModel.findByIdAndUpdate(user.id, {
      password: hashedPassword,
      publicKey: newPublicKey,
      encryptedPrivateKey: newEncryptedPrivateKey,
      storageUsed: 0,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    })

    console.log(
      `Password reset for ${user.email}: deleted ${deletedCount} files, rotated keys, storage reset`,
    )

    return {
      success: true,
      message: "Password has been reset successfully. All encrypted files have been purged and new encryption keys have been provisioned.",
      filesDeleted: deletedCount,
    }
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

  static async SaveBackupCodes(
    userId: string,
    hashedCodes: string[],
    encryptedBlob: string,
    iv: string,
    salt: string,
  ) {
    const backupCodes = hashedCodes.map((hash) => ({
      hash,
      consumed: false,
    }))

    await userModel.findByIdAndUpdate(userId, {
      backupCodes,
      encryptedBackupCodes: encryptedBlob,
      backupCodesIV: iv,
      backupCodesSalt: salt,
    })

    return { success: true, message: "Backup codes saved successfully.", totalCodes: hashedCodes.length }
  }

  static async VerifyBackupCode(email: string, codeHash: string, tempToken: string) {
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

    if (!user.backupCodes || user.backupCodes.length === 0) {
      return { success: false, message: "No backup codes have been configured." }
    }

    const codeIndex = user.backupCodes.findIndex(
      (bc) => bc.hash === codeHash && !bc.consumed,
    )

    if (codeIndex === -1) {
      return { success: false, message: "Invalid or already used backup code." }
    }

    user.backupCodes[codeIndex].consumed = true
    user.backupCodes[codeIndex].consumedAt = new Date()
    await user.save()

    const remaining = user.backupCodes.filter((bc) => !bc.consumed).length

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
        remainingBackupCodes: remaining,
      },
    }
  }

  static async GetBackupCodesData(userId: string) {
    const user = await userModel.findById(userId).select(
      "encryptedBackupCodes backupCodesIV backupCodesSalt backupCodes",
    )

    if (!user) {
      return { success: false, message: "User not found." }
    }

    const total = user.backupCodes?.length || 0
    const consumed = user.backupCodes?.filter((bc) => bc.consumed).length || 0
    const remaining = total - consumed

    return {
      success: true,
      data: {
        encryptedBackupCodes: user.encryptedBackupCodes || null,
        backupCodesIV: user.backupCodesIV || null,
        backupCodesSalt: user.backupCodesSalt || null,
        totalCodes: total,
        consumedCodes: consumed,
        remainingCodes: remaining,
      },
    }
  }
}