import { createAction } from "@reduxjs/toolkit";

// Shared across slices: a user's name/avatar changed (own edit or a realtime
// `user:updated` event). Every slice that caches people reacts to it.
export const userUpdated = createAction<{
  id: string;
  name: string;
  avatar?: string | null;
}>("user/updated");
