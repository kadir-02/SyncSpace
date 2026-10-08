import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["lead", "member"]),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

export const updateTeamMemberRoleSchema = z.object({
  role: z.enum(["lead", "member"]),
});

export type UpdateTeamMemberRoleInput = z.infer<
  typeof updateTeamMemberRoleSchema
>;

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
