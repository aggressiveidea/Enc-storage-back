import type { Types } from "mongoose"

export declare interface User {
  _id?: string | Types.ObjectId
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  publicKey: string
  encryptedPrivateKey: string
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  otpCode?: string
  otpExpires?: Date
  isEmailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  backupCodes: Array<{ hash: string; consumed: boolean; consumedAt?: Date }>
  encryptedBackupCodes?: string
  backupCodesIV?: string
  backupCodesSalt?: string
  totpSecret?: string
  totpEnabled: boolean
  mfaSetupComplete: boolean
  storageQuota: number
  storageUsed: number
  createdAt?: Date
  updatedAt?: Date
}

export declare interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  publicKey: string
  encryptedPrivateKey: string
  storageUsed: number
  storageQuota: number
}

export declare interface File {
  ownerId: Types.ObjectId
  filename: string
  originalName: string
  mimeType: string
  size: number
  encryptedPath: string
  encryptedKey: string  
  iv: string            
  authTag: string       
  createdAt?: Date
}

export declare interface EmailTemplateData {
  userName: string
  formattedDate: string
  location: string
  pointDeVenteName: string
  year: number
}