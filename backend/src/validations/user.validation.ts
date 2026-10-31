import { z } from "zod";

export const searchUsersSchema = z.object({
  q: z.string().trim().min(3, "Enter at least 3 characters").max(100),
  workspaceId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid workspace ID")
    .optional(),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
