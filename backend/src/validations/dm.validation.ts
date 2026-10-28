
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const createConversationSchema = z.object({
  recipientId: objectIdSchema,
});

export const sendDirectMessageSchema = z.object({
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

export type SendDirectMessageInput = z.infer<
  typeof sendDirectMessageSchema
>;
