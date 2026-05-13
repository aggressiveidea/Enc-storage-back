import { UserService } from "../services/Users.service"
import { ErrorResponseUtil, SuccessResponseUtil } from "../utils/Responses.util"
import { StatusCodes } from "http-status-codes"
import type { Request, Response, NextFunction } from "express"

export class UserController {
  static async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.getAllUsers()
      if (!users || users.length === 0) {
        const response = new SuccessResponseUtil({
          message: "No users found in the system yet.",
          data: [],
        })
        res.status(StatusCodes.OK).json(response)
        return
      }
      const response = new SuccessResponseUtil({
        message: "Users loaded successfully.",
        data: users,
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Error fetching users:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to load users right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }

  static async getUserByID(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserByID(String(req.params.id))
      if (!user) {
        const error = new ErrorResponseUtil().setError(
          "User not found. They may have been removed or the ID is incorrect."
        )
        res.status(StatusCodes.NOT_FOUND).json(error)
        return
      }
      const response = new SuccessResponseUtil({
        message: "User loaded successfully.",
        data: user,
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Error fetching user:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to load this user right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedUser = await UserService.UpdateUser(String(req.params.id), req.body)
      if (!updatedUser) {
        const error = new ErrorResponseUtil().setError(
          "User not found. They may have been removed or the ID is incorrect."
        )
        res.status(StatusCodes.NOT_FOUND).json(error)
        return
      }
      const response = new SuccessResponseUtil({
        message: "User updated successfully.",
        data: updatedUser,
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Error updating user:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to update this user right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deletedUser = await UserService.DeleteUser(String(req.params.id))
      if (!deletedUser) {
        const error = new ErrorResponseUtil().setError(
          "User not found. They may have already been removed."
        )
        res.status(StatusCodes.NOT_FOUND).json(error)
        return
      }
      const response = new SuccessResponseUtil({
        message: "User deleted successfully.",
        data: deletedUser,
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Error deleting user:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to delete this user right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { role } = req.body

    if (!["user", "admin", "super_admin"].includes(role)) {
      const error = new ErrorResponseUtil().setError(
        "Invalid role. Must be one of: user, admin, or super_admin."
      )
      res.status(StatusCodes.BAD_REQUEST).json(error)
      return
    }

    try {
      const updatedUser = await UserService.UpdateUser(String(req.params.id), { role })
      if (!updatedUser) {
        const error = new ErrorResponseUtil().setError(
          "User not found. They may have been removed or the ID is incorrect."
        )
        res.status(StatusCodes.NOT_FOUND).json(error)
        return
      }
      const response = new SuccessResponseUtil({
        message: "User role updated successfully.",
        data: updatedUser,
      })
      res.status(StatusCodes.OK).json(response)
    } catch (err) {
      console.error("Error updating user role:", err)
      const error = new ErrorResponseUtil().setError(
        "Unable to update the user role right now. Please try again."
      )
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
    }
  }
}
