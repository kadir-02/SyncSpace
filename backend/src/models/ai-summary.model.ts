import mongoose, { Document, Schema } from "mongoose";
import { aiConfig } from "../config/ai.js";

// Cached summaries so reopening the same period costs no AI quota.
export interface IAiSummary extends Document {
  channel: mongoose.Types.ObjectId;
  cacheKey: string;
  result: unknown;
  totalMessages: number;
  includedMessages: number;
  createdAt: Date;
}

const aiSummarySchema = new Schema<IAiSummary>({
  channel: {
    type: Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  },
  cacheKey: { type: String, required: true, unique: true },
  result: { type: Schema.Types.Mixed, required: true },
  totalMessages: { type: Number, required: true },
  includedMessages: { type: Number, required: true },
  // Mongo removes the document automatically after the TTL.
  createdAt: {
    type: Date,
    default: Date.now,
    expires: aiConfig.cacheTtlSeconds,
  },
});

export const AiSummary = mongoose.model<IAiSummary>("AiSummary", aiSummarySchema);
