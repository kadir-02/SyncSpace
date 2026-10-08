import { Router } from "express";
import {
  createTeamController,
  getWorkspaceTeamsController,
} from "../controllers/team.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post(
  "/:workspaceId/teams",
  authMiddleware,
  asyncHandler(createTeamController),
);
router.get(
  "/:workspaceId/teams",
  authMiddleware,
  asyncHandler(getWorkspaceTeamsController),
);

export default router;
