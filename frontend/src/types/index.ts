export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export type UserLite = Pick<User, "id" | "name" | "email" | "avatar">;

export type WorkspaceRole = "owner" | "admin" | "member";
export type TeamRole = "lead" | "member";
export type ChannelType = "public" | "private";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  createdAt?: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  workspaceRole: WorkspaceRole;
  joinedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  workspace: string;
  isMember: boolean;
  myRole: TeamRole | null;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  teamRole: TeamRole;
  joinedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  team: string;
  createdBy?: UserLite | string;
  createdAt?: string;
}

export interface ChannelMember {
  id: string;
  channel: string;
  user: UserLite;
  joinedAt?: string;
}

export interface Attachment {
  id: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface UploadedFile extends Attachment {
  workspace?: string;
  channel?: string;
  uploadedBy?: UserLite | string;
  createdAt?: string;
}

export interface Message {
  id: string;
  channel: string;
  // Populated by the API; may be a bare id on older server builds.
  sender: UserLite | string;
  content: string;
  attachments: Attachment[];
  edited: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  participants: UserLite[];
  lastMessage?: {
    id: string;
    content: string;
    sender: UserLite | string;
    createdAt: string;
  } | null;
  updatedAt?: string;
}

export interface DirectMessage {
  id: string;
  conversation: string;
  sender: UserLite | string;
  content: string;
  edited?: boolean;
  createdAt: string;
}

export type NotificationType =
  | "message"
  | "direct_message"
  | "workspace_invite"
  | "team_invite"
  | "channel_invite"
  | "mention"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string;
  resourceType?: string;
  // Populated on fetch, a bare id on live socket events.
  channel?: string | { id: string; name: string; type: ChannelType; team: string };
  sender?: UserLite | string;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCount {
  channelId: string;
  channelName: string;
  unreadCount: number;
}

export type ActiveChat =
  | { type: "channel"; id: string }
  | { type: "dm"; id: string }
  | null;
