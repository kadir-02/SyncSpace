import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Pagination, UploadedFile } from "@/types";
import { apiThunk } from "../thunk";
import { sendMessage } from "./messageSlice";
import { sendDirectMessage } from "./dmSlice";

interface WorkspaceFiles {
  items: UploadedFile[];
  page: number;
  totalPages: number;
  status: "idle" | "loading" | "ready" | "error";
  loadingMore: boolean;
}

interface FileState {
  byWorkspace: Record<string, WorkspaceFiles>;
  // Files uploaded from a composer, waiting to be sent. Keyed by channel id,
  // or "dm:<conversationId>" for direct messages.
  pending: Record<string, UploadedFile[]>;
  uploading: Record<string, boolean>; // pending key (or workspaceId) -> in flight
}

const initialState: FileState = { byWorkspace: {}, pending: {}, uploading: {} };

const PAGE_SIZE = 24;

export const pendingKeyFor = (target: { channelId?: string; conversationId?: string }) =>
  target.channelId ?? (target.conversationId ? `dm:${target.conversationId}` : undefined);

export const fetchFiles = apiThunk<
  { workspaceId: string; page: number; files: UploadedFile[]; pagination: Pagination },
  { workspaceId: string; page?: number }
>("files/fetch", async ({ workspaceId, page = 1 }) => {
  const result = await api<{ files: UploadedFile[]; pagination: Pagination }>(
    `/files/workspace/${workspaceId}`,
    { query: { page, limit: PAGE_SIZE } },
  );

  return { workspaceId, page, ...result };
});

export const uploadFile = apiThunk<
  UploadedFile,
  { workspaceId: string; channelId?: string; conversationId?: string; file: File }
>("files/upload", ({ workspaceId, channelId, conversationId, file }) => {
  const formData = new FormData();

  formData.append("workspaceId", workspaceId);
  if (channelId) formData.append("channelId", channelId);
  // DM files stay out of the workspace-wide Files page.
  if (conversationId) formData.append("purpose", "dm");
  // Multer reads the file field, so append it last.
  formData.append("file", file);

  return api<UploadedFile>("/files/upload", { method: "POST", formData });
});

export const deleteFile = apiThunk<
  { fileId: string; workspaceId: string },
  { fileId: string; workspaceId: string }
>("files/delete", async ({ fileId, workspaceId }) => {
  await api(`/files/${fileId}`, { method: "DELETE" });
  return { fileId, workspaceId };
});

const ensure = (state: FileState, workspaceId: string) => {
  if (!state.byWorkspace[workspaceId]) {
    state.byWorkspace[workspaceId] = {
      items: [],
      page: 0,
      totalPages: 1,
      status: "idle",
      loadingMore: false,
    };
  }

  return state.byWorkspace[workspaceId];
};

const fileSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    pendingAttachmentRemoved(
      state,
      action: PayloadAction<{ key: string; fileId: string }>,
    ) {
      state.pending[action.payload.key] = (
        state.pending[action.payload.key] ?? []
      ).filter((file) => file.id !== action.payload.fileId);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiles.pending, (state, { meta }) => {
        const entry = ensure(state, meta.arg.workspaceId);

        if ((meta.arg.page ?? 1) > 1) entry.loadingMore = true;
        else if (entry.status !== "ready") entry.status = "loading";
      })
      .addCase(fetchFiles.fulfilled, (state, { payload }) => {
        const entry = ensure(state, payload.workspaceId);

        // Files sent in DMs belong to their conversation, not the workspace list.
        const files = payload.files.filter((file) => !file.isDirectMessage);

        entry.items =
          payload.page === 1
            ? files
            : [
                ...entry.items,
                ...files.filter(
                  (file) => !entry.items.some((existing) => existing.id === file.id),
                ),
              ];
        entry.page = payload.page;
        entry.totalPages = payload.pagination.totalPages;
        entry.status = "ready";
        entry.loadingMore = false;
      })
      .addCase(fetchFiles.rejected, (state, { meta }) => {
        const entry = ensure(state, meta.arg.workspaceId);
        entry.status = "error";
        entry.loadingMore = false;
      })
      .addCase(uploadFile.pending, (state, { meta }) => {
        state.uploading[pendingKeyFor(meta.arg) ?? meta.arg.workspaceId] = true;
      })
      .addCase(uploadFile.fulfilled, (state, { payload, meta }) => {
        const { conversationId, workspaceId } = meta.arg;
        const key = pendingKeyFor(meta.arg);
        state.uploading[key ?? workspaceId] = false;

        if (key) {
          (state.pending[key] ??= []).push(payload);
        }

        // Private DM files never appear in the shared workspace list.
        const entry = state.byWorkspace[workspaceId];
        if (entry && !conversationId) entry.items.unshift(payload);
      })
      .addCase(uploadFile.rejected, (state, { meta }) => {
        state.uploading[pendingKeyFor(meta.arg) ?? meta.arg.workspaceId] = false;
      })
      .addCase(deleteFile.fulfilled, (state, { payload }) => {
        const entry = state.byWorkspace[payload.workspaceId];
        if (entry) entry.items = entry.items.filter((file) => file.id !== payload.fileId);
      })
      // Attachments are consumed once their message is sent.
      .addCase(sendMessage.fulfilled, (state, { meta }) => {
        delete state.pending[meta.arg.channelId];
      })
      .addCase(sendDirectMessage.fulfilled, (state, { meta }) => {
        delete state.pending[`dm:${meta.arg.conversationId}`];
      });
  },
});

export const { pendingAttachmentRemoved } = fileSlice.actions;
export default fileSlice.reducer;
