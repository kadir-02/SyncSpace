
import mongoose, { Schema, Types } from "mongoose";

export interface IConversation {
  participants: Types.ObjectId[];
  createdBy: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "DirectMessage",
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema,
);
