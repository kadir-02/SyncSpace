import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const markMessagesReadSchema = z.object({
  channelId: objectIdSchema,
  messageIds: z
    .array(objectIdSchema)
    .min(1, "At least one message ID is required")
    .max(100, "Maximum 100 messages allowed"),
});
