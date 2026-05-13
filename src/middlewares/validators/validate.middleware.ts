import type { Request, Response, NextFunction } from "express"
import type { ZodSchema, ZodIssue } from "zod"
import { StatusCodes } from "http-status-codes"
import { ErrorResponseUtil } from "../../utils/Responses.util"
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, VerifyOTPSchema, ResendOTPSchema, ResendVerificationSchema, VerifyTOTPSetupSchema, VerifyTOTPLoginSchema } from "../../types/validation.schemas"

export const validate = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body)

      if (!result.success) {
        const validationErrors = result.error.errors.map((err: ZodIssue) => ({
          field: err.path.join("."),
          message: err.message,
        }))

        const error = new ErrorResponseUtil().setError("Validation failed")
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Validation failed",
          validationErrors,
        })
        return
      }

      req.body = result.data
      next()
    } catch (error) {
      console.error("Validation middleware error:", error)
      const errorResponse = new ErrorResponseUtil().setError("Validation error")
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResponse)
    }
  }
}

export const validateRegister = validate(RegisterSchema)
export const validateLogin = validate(LoginSchema)
export const validateForgotPassword = validate(ForgotPasswordSchema)
export const validateResetPassword = validate(ResetPasswordSchema)
export const validateVerifyOTP = validate(VerifyOTPSchema)
export const validateResendOTP = validate(ResendOTPSchema)
export const validateResendVerification = validate(ResendVerificationSchema)
export const validateVerifyTOTPSetup = validate(VerifyTOTPSetupSchema)
export const validateVerifyTOTPLogin = validate(VerifyTOTPLoginSchema)