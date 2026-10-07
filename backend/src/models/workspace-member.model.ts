import mongoose, { Document, Schema } from "mongoose";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface IWorkspaceMember extends Document {
  workspace: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });

export const WorkspaceMember = mongoose.model<IWorkspaceMember>(
  "WorkspaceMember",
  workspaceMemberSchema,
);
