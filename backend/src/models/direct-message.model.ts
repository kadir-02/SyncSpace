
import mongoose, { Schema, Types } from "mongoose";

export interface IDirectMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    edited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

directMessageSchema.index({ conversation: 1, createdAt: -1 });

export const DirectMessage = mongoose.model<IDirectMessage>(
  "DirectMessage",
  directMessageSchema,
);
