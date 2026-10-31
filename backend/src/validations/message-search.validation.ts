import { z } from "zod";

export const messageSearchSchema = z.object({
  channelId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid channel ID"),
  query: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
