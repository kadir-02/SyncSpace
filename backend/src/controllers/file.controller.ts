import type { Request, Response } from "express";
import {
  uploadFile,
  getWorkspaceFiles,
  deleteFile,
} from "../services/file.service.js";
import {
  uploadFileSchema,
  fileIdSchema,
} from "../validations/file.validation.js";
import { sendSuccess } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

export const uploadFileController = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("Please select a file to upload", 400);
  }

  const { workspaceId, channelId } = uploadFileSchema.parse({
    workspaceId: req.body.workspaceId,
    ...(req.body.channelId ? { channelId: req.body.channelId } : {}),
  });

  const file = await uploadFile({
    file: req.file,
    userId: req.user!.userId,
    workspaceId,
    ...(channelId ? { channelId } : {}),
  });

  return sendSuccess(res, 201, "File uploaded successfully", file);
};

export const getWorkspaceFilesController = async (
  req: Request<{ workspaceId: string }>,
  res: Response,
) => {
  const workspaceId = req.params.workspaceId;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AppError(
      "Page must be positive and limit must be between 1 and 100",
      400,
    );
  }

  const result = await getWorkspaceFiles(
    workspaceId,
    req.user!.userId,
    page,
    limit,
  );

  return sendSuccess(res, 200, "Files fetched successfully", result);
};

export const deleteFileController = async (
  req: Request<{ fileId: string }>,
  res: Response,
) => {
  const { fileId } = fileIdSchema.parse(req.params);

  await deleteFile(fileId, req.user!.userId);

  return sendSuccess(res, 200, "File deleted successfully", null);
};
