import { z } from "zod"
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  role: z.enum(["user", "admin", "super_admin"]).optional().default("user"),
  publicKey: z.string().min(1, "Public key is required"),
  encryptedPrivateKey: z.string().min(1, "Encrypted private key is required"),
})

export const LoginSchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(1, "password is required"),
})

export const UpdateUserRoleSchema = z.object({
  role: z.enum(["user", "admin", "super_admin"]),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email("invalid email format"),
})

export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
})
