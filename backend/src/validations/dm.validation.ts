
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const createConversationSchema = z.object({
  recipientId: objectIdSchema,
});

// A message needs text, attachments, or both.
export const sendDirectMessageSchema = z
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

export const updateDirectMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export const conversationIdSchema = z.object({
  conversationId: objectIdSchema,
});

export const directMessageIdSchema = z.object({
  messageId: objectIdSchema,
});

export type CreateConversationInput = z.infer<
  typeof createConversationSchema
>;

export type UpdateDirectMessageInput = z.infer<
  typeof updateDirectMessageSchema
>;

export type SendDirectMessageInput = z.infer<
  typeof sendDirectMessageSchema
>;
