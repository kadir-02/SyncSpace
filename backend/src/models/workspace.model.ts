import mongoose, { Document, Schema } from "mongoose";

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  owner: mongoose.Types.ObjectId;
  aiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // AI features send messages to a third-party provider, so admins opt in.
    aiEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Workspace = mongoose.model<IWorkspace>(
  "Workspace",
  workspaceSchema
);