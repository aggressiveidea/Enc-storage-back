import { Schema, model } from "mongoose";

export const UserSchema = new Schema  (
  {
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, trim: true, required: true },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    storageQuota: { type: Number, default: 1_000_000_000 },
    storageUsed: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    otpCode: { type: String },
    otpExpires: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    backupCodes: {
      type: [
        {
          hash: { type: String },
          consumed: { type: Boolean, default: false },
          consumedAt: { type: Date },
        },
      ],
      default: [],
    },
    encryptedBackupCodes: { type: String },
    backupCodesIV: { type: String },
    backupCodesSalt: { type: String },
    totpSecret: { type: String },
    totpEnabled: { type: Boolean, default: false },
    mfaSetupComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const userModel = model("user", UserSchema);
