import { z } from "zod";
import { aiConfig } from "../config/ai.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// The client sends exact boundaries (computed in the user's timezone), so
// "today" and custom ranges both arrive as a from/to pair.
export const summarizeChannelSchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  })
  .refine((data) => new Date(data.from) < new Date(data.to), {
    message: "Start must be before end",
    path: ["from"],
  })
  .refine(
    (data) =>
      new Date(data.to).getTime() - new Date(data.from).getTime() <=
      aiConfig.maxRangeDays * DAY_MS,
    {
      message: `Choose a period of ${aiConfig.maxRangeDays} days or less`,
      path: ["to"],
    },
  );

export type SummarizeChannelInput = z.infer<typeof summarizeChannelSchema>;
