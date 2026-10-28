import mongoose, { Schema, Types } from "mongoose";

export interface IFile {
  originalName: string;
  publicId: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  workspace: Types.ObjectId;
  channel?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: false,
    },
  },
  { timestamps: true },
);

fileSchema.index({ workspace: 1, createdAt: -1 });
fileSchema.index({ channel: 1, createdAt: -1 });
fileSchema.index({ uploadedBy: 1, createdAt: -1 });

export const File = mongoose.model<IFile>("File", fileSchema);
