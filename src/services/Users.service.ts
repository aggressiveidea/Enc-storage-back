import { userModel } from "../config/models/User.model"
import { User } from "../types/globals"

export class UserService {
  static async getAllUsers() {
    try {
      return await userModel.find()
    } catch (err) {
      console.error("Error fetching users:", err)
      throw new Error("Unable to fetch users from the database.")
    }
  }

  static async getUserByID(id: string) {
    try {
      const user = await userModel.findById(id)
      return user || null
    } catch (err) {
      console.error(`Error fetching user ${id}:`, err)
      throw new Error("Unable to fetch this user from the database.")
    }
  }

  static async UpdateUser(id: string, data: Partial<User>) {
    try {
      const updatedUser = await userModel.findByIdAndUpdate(id, data, { new: true })
      return updatedUser || null
    } catch (err) {
      console.error(`Error updating user ${id}:`, err)
      throw new Error("Unable to update this user in the database.")
    }
  }

  static async DeleteUser(id: string) {
    try {
      const deletedUser = await userModel.findByIdAndDelete(id)
      return deletedUser || null
    } catch (err) {
      console.error(`Error deleting user ${id}:`, err)
      throw new Error("Unable to delete this user from the database.")
    }
  }
}
