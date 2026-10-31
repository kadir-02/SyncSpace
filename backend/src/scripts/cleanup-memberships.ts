/**
 * One-off cleanup for data created before the access fix.
 *
 * Removing a user from a workspace used to leave their team and private-channel
 * memberships behind, so they kept access. This removes those stale rows.
 *
 * Run once:  npx tsx src/scripts/cleanup-memberships.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Team } from "../models/team.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) throw new Error("MONGODB_URI is not defined");

  await mongoose.connect(mongoUri);

  let removedTeamMembers = 0;
  let removedChannelMembers = 0;

  const teams = await Team.find().select("_id workspace");

  for (const team of teams) {
    const workspaceUserIds = new Set(
      (await WorkspaceMember.find({ workspace: team.workspace }).distinct(
        "user",
      )).map((id) => id.toString()),
    );

    const teamMembers = await TeamMember.find({ team: team._id });
    const stale = teamMembers.filter(
      (member) => !workspaceUserIds.has(member.user.toString()),
    );

    if (stale.length === 0) continue;

    const staleUserIds = stale.map((member) => member.user);

    const channelIds = await Channel.find({ team: team._id }).distinct("_id");

    const channelResult = await ChannelMember.deleteMany({
      channel: { $in: channelIds },
      user: { $in: staleUserIds },
    });

    const teamResult = await TeamMember.deleteMany({
      _id: { $in: stale.map((member) => member._id) },
    });

    removedChannelMembers += channelResult.deletedCount;
    removedTeamMembers += teamResult.deletedCount;
  }

  console.log(
    `Removed ${removedTeamMembers} stale team memberships and ${removedChannelMembers} stale channel memberships.`,
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
