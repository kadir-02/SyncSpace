import mongoose, { Schema, Types } from "mongoose";

export interface IMessageRead {
  message: Types.ObjectId;
  channel: Types.ObjectId;
  user: Types.ObjectId;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageReadSchema = new Schema<IMessageRead>(
  {
    message: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

messageReadSchema.index({ message: 1, user: 1 }, { unique: true });

messageReadSchema.index({ channel: 1, user: 1, readAt: -1 });

export const MessageRead = mongoose.model<IMessageRead>(
  "MessageRead",
  messageReadSchema,
);
