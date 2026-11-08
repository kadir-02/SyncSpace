import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { AiStatus, ChannelSummaryResult } from "@/types";
import { apiThunk } from "../thunk";

interface SummaryEntry {
  status: "loading" | "ready" | "error";
  result: ChannelSummaryResult | null;
  error: string | null;
  // Human label for the period that produced `result` ("Today", "Last 7 days"...).
  label: string;
}

interface AiState {
  // null until the server has answered.
  status: AiStatus | null;
  summaries: Record<string, SummaryEntry>;
}

const initialState: AiState = { status: null, summaries: {} };

export const fetchAiStatus = apiThunk<AiStatus>("ai/status", () =>
  api<AiStatus>("/ai/status"),
);

export const summarizeChannel = apiThunk<
  ChannelSummaryResult,
  { channelId: string; from: string; to: string; label: string }
>("ai/summarize", ({ channelId, from, to }) =>
  api<ChannelSummaryResult>(`/ai/channels/${channelId}/summary`, {
    method: "POST",
    body: { from, to },
  }),
);

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    summaryCleared(state, action: { payload: string }) {
      delete state.summaries[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAiStatus.fulfilled, (state, { payload }) => {
        state.status = payload;
      })
      .addCase(summarizeChannel.pending, (state, { meta }) => {
        const previous = state.summaries[meta.arg.channelId];

        state.summaries[meta.arg.channelId] = {
          status: "loading",
          // Keep showing the previous result while the new one loads.
          result: previous?.result ?? null,
          error: null,
          label: meta.arg.label,
        };
      })
      .addCase(summarizeChannel.fulfilled, (state, { payload, meta }) => {
        state.summaries[meta.arg.channelId] = {
          status: "ready",
          result: payload,
          error: null,
          label: meta.arg.label,
        };
      })
      .addCase(summarizeChannel.rejected, (state, { payload, meta }) => {
        state.summaries[meta.arg.channelId] = {
          status: "error",
          result: state.summaries[meta.arg.channelId]?.result ?? null,
          error: payload ?? "Could not generate the summary",
          label: meta.arg.label,
        };
      });
  },
});

export const { summaryCleared } = aiSlice.actions;
export default aiSlice.reducer;
