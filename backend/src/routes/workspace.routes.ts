import { Router } from "express";
import {
  addMember,
  createWorkspaceController,
  deleteWorkspaceController,
  getMembers,
  getMyWorkspaces,
  getWorkspace,
  leaveWorkspaceController,
  removeMember,
  transferOwnership,
  updateMemberRole,
} from "../controllers/workspace.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post("/", authMiddleware, asyncHandler(createWorkspaceController));
router.get("/", authMiddleware, asyncHandler(getMyWorkspaces));
router.post("/:id/members", authMiddleware, asyncHandler(addMember));
router.get("/:id/members", authMiddleware, asyncHandler(getMembers));
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  asyncHandler(removeMember),
);
router.patch(
  "/:id/members/:userId",
  authMiddleware,
  asyncHandler(updateMemberRole),
);
router.delete(
  "/:id/leave",
  authMiddleware,
  asyncHandler(leaveWorkspaceController),
);
router.patch(
  "/:id/transfer-ownership",
  authMiddleware,
  asyncHandler(transferOwnership),
);

router.delete("/:id", authMiddleware, asyncHandler(deleteWorkspaceController));
router.get("/:id", authMiddleware, asyncHandler(getWorkspace));

export default router;
