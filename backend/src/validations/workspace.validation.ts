import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    aiEnabled: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.aiEnabled !== undefined, {
    message: "Provide a name or aiEnabled",
    path: ["name"],
  });

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

// Members can be added by user ID or by email (so the UI doesn't need raw IDs).
export const addWorkspaceMemberSchema = z
  .object({
    userId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid user ID")
      .optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    role: z.enum(["admin", "member"]),
  })
  .refine((data) => data.userId || data.email, {
    message: "Either userId or email is required",
    path: ["userId"],
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
