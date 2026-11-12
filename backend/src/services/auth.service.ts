import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { LoginInput, RegisterInput } from "../validations/auth.validation.js";
import { AppError } from "../utils/app-error.js";
import { generateAccessToken } from "../utils/jwt.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../emails/reset-password.js";

export const createUser = async ({ name, email, password }: RegisterInput) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("User already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
};

export const loginUser = async ({ email, password }: LoginInput) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(
    user._id.toString(),
    user.role
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    },
    accessToken,
  };
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  });

  // Do not reveal whether an account exists.
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = new Date(
    Date.now() + 15 * 60 * 1000
  );

  await user.save();

  const resetUrl =
    `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    throw error;
  }
};
