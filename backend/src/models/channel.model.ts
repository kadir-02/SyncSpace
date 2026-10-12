import mongoose, { Document, Schema } from "mongoose";

export type ChannelType = "public" | "private";

export interface IChannel extends Document {
  name: string;
  description?: string;
  type: ChannelType;
  team: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Channel names must be unique within each team.
channelSchema.index({ team: 1, name: 1 }, { unique: true });

export const Channel = mongoose.model<IChannel>("Channel", channelSchema);
