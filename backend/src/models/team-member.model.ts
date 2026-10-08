import mongoose, { Document, Schema } from "mongoose";

export type TeamRole = "lead" | "member";

export interface ITeamMember extends Document {
  team: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: TeamRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["lead", "member"],
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

teamMemberSchema.index({ team: 1, user: 1 }, { unique: true });

export const TeamMember = mongoose.model<ITeamMember>(
  "TeamMember",
  teamMemberSchema,
);
