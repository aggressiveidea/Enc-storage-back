import type { Types } from "mongoose"

export declare interface User {
  _id?: string | Types.ObjectId
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  public_key: string
  private_key: string
  createdAt?: Date
  updatedAt?: Date
}

export declare interface EmailTemplateData {
  userName: string
  formattedDate: string
  location: string
  pointDeVenteName: string
  year: number
}