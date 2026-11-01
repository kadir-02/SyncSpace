import { z } from "zod";

export const searchUsersSchema = z.object({
  q: z.string().trim().min(3, "Enter at least 3 characters").max(100),
  workspaceId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid workspace ID")
    .optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(100),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
