import mongoose, { Document, Schema } from "mongoose";

export interface IChannelMember extends Document {
  channel: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const channelMemberSchema = new Schema<IChannelMember>(
  {
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
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// A user can only be added once to a channel.
channelMemberSchema.index({ channel: 1, user: 1 }, { unique: true });

export const ChannelMember = mongoose.model<IChannelMember>(
  "ChannelMember",
  channelMemberSchema,
);
