import { Request, Response } from "express";
import {
  createUser,
  loginUser,
  forgotPassword as forgotPasswordService,
} from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
} from "../validations/auth.validation.js";
import { sendSuccess } from "../utils/api-response.js";

export const registerUser = async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const user = await createUser(data);

  return sendSuccess(res, 201, "User registered successfully", user);
};

export const login = async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await loginUser(data);

  return sendSuccess(res, 200, "Login successful", user);
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  await forgotPasswordService(email);

  return sendSuccess(
    res,
    200,
    "If an account exists with this email, a password reset link has been sent.",
    null,
  );
};
