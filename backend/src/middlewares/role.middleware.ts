import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";

type UserRole = "user" | "admin";

export const requireRole = (...roles: UserRole[]) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required", 401)
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission", 403)
      );
    }

    next();
  };
};