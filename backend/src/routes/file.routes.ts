import { Router } from "express";
import {
  uploadFileController,
  getWorkspaceFilesController,
  deleteFileController,
} from "../controllers/file.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/upload",
  upload.single("file"),
  asyncHandler(uploadFileController),
);

router.get(
  "/workspace/:workspaceId",
  asyncHandler(getWorkspaceFilesController),
);

router.delete("/:fileId", asyncHandler(deleteFileController));

export default router;
