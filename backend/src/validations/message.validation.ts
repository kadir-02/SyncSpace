import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

// A message needs text, attachments, or both.
export const createMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .max(5000, "Message cannot exceed 5000 characters")
      .default(""),
    attachmentIds: z
      .array(objectIdSchema)
      .max(5, "You can attach up to 5 files")
      .default([]),
  })
  .refine((data) => data.content.length > 0 || data.attachmentIds.length > 0, {
    message: "Message cannot be empty",
    path: ["content"],
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
