import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "member"]),
});

export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;

export const updateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export type UpdateWorkspaceMemberRoleInput = z.infer<
  typeof updateWorkspaceMemberRoleSchema
>;

export const transferWorkspaceOwnershipSchema = z.object({
  userId: z.string().min(1),
});

export type TransferWorkspaceOwnershipInput = z.infer<
  typeof transferWorkspaceOwnershipSchema
>;
