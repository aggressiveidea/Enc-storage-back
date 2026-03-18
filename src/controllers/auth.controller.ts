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
    } catch (error) {
      console.error("Login error:", error)
      const errorResponse = new ErrorResponseUtil().setError("Database connection error")
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }
  static async Register(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = req.body

      if (!userData) {
        const error = new ErrorResponseUtil().setError("no user data")
        res.status(StatusCodes.BAD_REQUEST).json(error)
        return
      }

      const user = await userModel.findOne({ email: userData.email })

      if (user) {
        const error = new ErrorResponseUtil().setError("user already exists")
        res.status(StatusCodes.BAD_REQUEST).json(error)
        return
      }

      const newUser = await AuthService.RegisterUser(
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
        userData.role || "user",
        userData.public_key || "test",
        userData.private_key || "test",
      )

      if (!newUser) {
        const error = new ErrorResponseUtil().setError("Failed to create user")
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
        return
      }

      const success = new SuccessResponseUtil({
        message: "Registration successful",
        data: newUser,
      })

      res.status(StatusCodes.CREATED).json(success)
    } catch (error) {
      console.error("Registration error:", error)
      const errorResponse = new ErrorResponseUtil().setError("Database connection error")
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