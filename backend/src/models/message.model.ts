import mongoose, { Schema, Types } from "mongoose";

export interface IMessage {
  channel: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
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
  {
    timestamps: true,
  },
);

messageSchema.index({ channel: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);
