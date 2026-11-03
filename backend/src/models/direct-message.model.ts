
import mongoose, { Schema, Types } from "mongoose";

export interface IDirectMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  attachments: Types.ObjectId[];
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
      // Content may be empty only when the message carries attachments.
      required: function (this: { attachments?: unknown[] }) {
        return !this.attachments || this.attachments.length === 0;
      },
      default: "",
      trim: true,
      maxlength: 5000,
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: "File",
      },
    ],
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
