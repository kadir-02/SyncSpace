import { z } from "zod";

export const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export const updateMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export const messageIdSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid message ID"),
});

export const channelIdSchema = z.object({
  channelId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid channel ID"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
