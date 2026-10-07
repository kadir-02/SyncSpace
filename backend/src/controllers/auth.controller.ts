import { Request, Response } from "express";
import { createUser, loginUser } from "../services/auth.service.js";
import { registerSchema, loginSchema } from "../validations/auth.validation.js";
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
