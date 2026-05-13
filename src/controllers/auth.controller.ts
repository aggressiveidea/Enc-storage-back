import { AuthService } from "../services/auth.service"
import { StatusCodes } from "http-status-codes"
import { SuccessResponseUtil, ErrorResponseUtil } from "../utils/Responses.util"
import type { Request, Response, NextFunction } from "express"
import { userModel } from "../config/models/User.model"
import { AuditService } from "../services/audit.service"

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const email: string = req.body.email
      const password: string = req.body.password

      const data = await AuthService.Login(email, password)

      if (!data) {
        const error = new ErrorResponseUtil().setError("Invalid password or email")
        res.status(StatusCodes.UNAUTHORIZED).json(error)
        return
      }

      const success = new SuccessResponseUtil({
        message: "Login initiated",
        data: data,
      })

      res.status(StatusCodes.OK).json(success)
    } catch (error: any) {
      console.error("Login error:", error)
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Database connection error")
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }
  static async Register(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = req.body

      const result = await AuthService.RegisterUser(
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
        userData.role || "user",
        userData.publicKey,
        userData.encryptedPrivateKey,
      )

      if (!result) {
        const error = new ErrorResponseUtil().setError("A user with this email already exists")
        res.status(StatusCodes.CONFLICT).json(error)
        return
      }

      const success = new SuccessResponseUtil({
        message: result.message,
        data: { email: result.email },
      })

      res.status(StatusCodes.CREATED).json(success)
    } catch (error: any) {
      console.error("Registration error:", error)
      const msg = error.name === 'ValidationError' ? Object.values(error.errors).map((e: any) => e.message).join(', ') : (error.message || "Database connection error")
      const errorResponse = new ErrorResponseUtil().setError(msg)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }

  static async ForgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.RequestPasswordReset(email);
      const response = new SuccessResponseUtil({
        message: result.message || "If an account with that email exists, a reset link has been sent.",
        data: result
      })
      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      console.error("Forgot password error:", error);
      const errorResponse = new ErrorResponseUtil().setError("Failed to process forgot password request");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async ResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { password, publicKey, encryptedPrivateKey } = req.body;
      const token = req.params.token as string;

      const result = await AuthService.ResetPassword(
        token,
        password,
        publicKey,
        encryptedPrivateKey,
      );

      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message);
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: result.message,
        data: { filesDeleted: result.filesDeleted },
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      console.error("Reset password error:", error);
      const errorResponse = new ErrorResponseUtil().setError("Failed to reset password");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async VerifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, tempToken } = req.body;

      const result = await AuthService.VerifyOTP(email, otp, tempToken);

      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message || "OTP verification failed");
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: "OTP verified successfully",
        data: result.data!,
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to verify OTP");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async ResendOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, tempToken } = req.body;

      const result = await AuthService.ResendOTP(email, tempToken);

      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message);
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: result.message,
        data: { tempToken: result.tempToken },
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to resend OTP");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async VerifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;

      const result = await AuthService.VerifyEmail(token);

      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message);
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: result.message,
        data: null,
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Verify email error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to verify email");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async ResendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      const result = await AuthService.ResendVerificationEmail(email);

      const response = new SuccessResponseUtil({
        message: result.message,
        data: null,
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Resend verification error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to resend verification");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async SaveBackupCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { hashedCodes, encryptedBlob, iv, salt } = req.body;

      const result = await AuthService.SaveBackupCodes(user.id, hashedCodes, encryptedBlob, iv, salt);

      const response = new SuccessResponseUtil({
        message: result.message,
        data: { totalCodes: result.totalCodes },
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Save backup codes error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to save backup codes");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async VerifyBackupCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, codeHash, tempToken } = req.body;

      const result = await AuthService.VerifyBackupCode(email, codeHash, tempToken);

      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message || "Backup code verification failed");
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: `Backup code accepted. ${result.data!.remainingBackupCodes} codes remaining.`,
        data: result.data!,
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Verify backup code error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to verify backup code");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  static async GetBackupCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;

      const result = await AuthService.GetBackupCodesData(user.id);

      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message || "Failed to get backup codes");
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: "Backup codes data retrieved",
        data: result.data!,
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error: any) {
      console.error("Get backup codes error:", error);
      const errorResponse = new ErrorResponseUtil().setError(error.message || "Failed to get backup codes");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}
