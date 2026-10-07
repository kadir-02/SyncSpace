import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId).select(
    "-passwordHash"
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
};