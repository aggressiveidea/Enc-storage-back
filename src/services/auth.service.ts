import { userModel } from "../config/models/User.model"
import { bcryptUtil } from "../utils/bcrypt.utils"
import { JwtUtil } from "../utils/jwt.utils"
import crypto from "crypto"

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

    const authToken = await JwtUtil.createToken(user.id)
    const data = {
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        public_key: user.public_key,
        private_key: user.private_key,
      },
    }
    return data
  }

  static async RegisterUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string,
    public_key: string = "test",
    private_key: string = "test",
  ) {
    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
      return null
    }
    const hashedPass = await bcryptUtil.hash(password)
    const user = await userModel.create({
      email,
      password: hashedPass,
      firstName,
      lastName,
      role,
      public_key,
      private_key,
    })

    if (!user) {
      return null
    }
    const authToken = await JwtUtil.createToken(user.id)
    const data = {
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        public_key: user.public_key,
        private_key: user.private_key,
      },
    }

    return data
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

    return {
      success: true,
      resetToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
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
}