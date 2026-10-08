import { Router } from "express";
import {
  addTeamMemberController,
  deleteTeamController,
  getTeamController,
  getTeamMembersController,
  removeTeamMemberController,
  updateTeamController,
  updateTeamMemberRoleController,
} from "../controllers/team.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/:teamId", authMiddleware, asyncHandler(getTeamController));
router.post(
  "/:teamId/members",
  authMiddleware,
  asyncHandler(addTeamMemberController),
);
router.get(
  "/:teamId/members",
  authMiddleware,
  asyncHandler(getTeamMembersController),
);
router.patch(
  "/:teamId/members/:userId",
  authMiddleware,
  asyncHandler(updateTeamMemberRoleController),
);
router.delete(
  "/:teamId/members/:userId",
  authMiddleware,
  asyncHandler(removeTeamMemberController),
);
router.patch("/:teamId", authMiddleware, asyncHandler(updateTeamController));
router.delete("/:teamId", authMiddleware, asyncHandler(deleteTeamController));

export default router;
