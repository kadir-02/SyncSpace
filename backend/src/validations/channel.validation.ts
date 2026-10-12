import { z } from "zod";

export const createChannelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["public", "private"]).default("public"),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["public", "private"]).optional(),
});

export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;

export const channelMemberSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
});

export type ChannelMemberInput = z.infer<typeof channelMemberSchema>;
