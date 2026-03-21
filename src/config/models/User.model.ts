import { Schema, model } from "mongoose";
import { User } from "../../types/globals";

export const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
      required: true,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    publicKey: {
      type: String,
      required: true,
    },
    storageQuota: {
      type: Number,
      default: 1_000_000_000, // 1 GB par example
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const userModel = model<User>("user", UserSchema);