import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const uploadFileSchema = z.object({
  workspaceId: objectIdSchema,
  channelId: objectIdSchema.optional(),
});

export const fileIdSchema = z.object({
  fileId: objectIdSchema,
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
