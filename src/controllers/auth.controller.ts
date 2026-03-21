import { AuthService } from "../services/auth.service"
import { StatusCodes } from "http-status-codes"
import { SuccessResponseUtil, ErrorResponseUtil } from "../utils/Responses.util"
import type { Request, Response, NextFunction } from "express"
import { userModel } from "../config/models/User.model"

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const email: string = req.body.email
      const password: string = req.body.password

      const data = await AuthService.Login(email, password)

      if (!data) {
        const error = new ErrorResponseUtil().setError("invalid password or email")
        console.log(error)
        res.status(StatusCodes.UNAUTHORIZED).json(error)
        return
      }

      const success = new SuccessResponseUtil({
        message: "Login successful",
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

      const newUser = await AuthService.RegisterUser(
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
        userData.role || "user",
        userData.publicKey,
      )

      if (!newUser) {
        const error = new ErrorResponseUtil().setError("A user with this email already exists")
        res.status(StatusCodes.CONFLICT).json(error)
        return
      }

      const success = new SuccessResponseUtil({
        message: "Registration successful",
        data: newUser,
      })

      res.status(StatusCodes.CREATED).json(success)
    } catch (error: any) {
      console.error("Registration error:", error)
      // extracting Mongoose validation error message psq ugh
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
      const { password } = req.body;
      const token = req.params.token as string;

      const result = await AuthService.ResetPassword(token, password);
      
      if (!result.success) {
        const error = new ErrorResponseUtil().setError(result.message);
        res.status(StatusCodes.BAD_REQUEST).json(error);
        return;
      }

      const response = new SuccessResponseUtil({
        message: result.message,
        data: null
      });
      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      console.error("Reset password error:", error);
      const errorResponse = new ErrorResponseUtil().setError("Failed to reset password");
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}
