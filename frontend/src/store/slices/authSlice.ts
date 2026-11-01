import { createSlice } from "@reduxjs/toolkit";
import { api, setAuthToken } from "@/lib/api";
import { clearToken, readToken, saveToken } from "@/lib/storage";
import { disconnectSocket } from "@/lib/socket";
import type { User } from "@/types";
import { apiThunk } from "../thunk";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
};

export const login = apiThunk<
  { user: User; accessToken: string },
  { email: string; password: string }
>("auth/login", async (credentials) => {
  const result = await api<{ user: User; accessToken: string }>("/auth/login", {
    method: "POST",
    body: credentials,
  });

  setAuthToken(result.accessToken);
  saveToken(result.accessToken);

  return result;
});

export const register = apiThunk<
  { user: User; accessToken: string },
  { name: string; email: string; password: string }
>("auth/register", async ({ name, email, password }) => {
  // The API doesn't return a token on register, so sign in right after.
  await api("/auth/register", { method: "POST", body: { name, email, password } });

  const result = await api<{ user: User; accessToken: string }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  setAuthToken(result.accessToken);
  saveToken(result.accessToken);

  return result;
});

// Restores a session from the stored token on page load.
export const bootstrapSession = apiThunk<{ user: User; token: string } | null>(
  "auth/bootstrap",
  async () => {
    const token = readToken();

    if (!token) return null;

    setAuthToken(token);

    try {
      const user = await api<User>("/auth/me");
      return { user, token };
    } catch (error) {
      setAuthToken(null);
      clearToken();
      throw error;
    }
  },
);

// Clears credentials and tears down the socket. The root reducer resets all
// slices when it sees `auth/loggedOut`.
export const logout = apiThunk<void>("auth/logout", async (_arg, { dispatch }) => {
  disconnectSocket();
  setAuthToken(null);
  clearToken();
  dispatch({ type: "auth/loggedOut" });
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.status = "authenticated";
        state.user = payload.user;
        state.token = payload.accessToken;
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.status = "unauthenticated";
        state.error = payload ?? "Login failed";
      })
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state, { payload }) => {
        state.status = "authenticated";
        state.user = payload.user;
        state.token = payload.accessToken;
      })
      .addCase(register.rejected, (state, { payload }) => {
        state.status = "unauthenticated";
        state.error = payload ?? "Registration failed";
      })
      .addCase(bootstrapSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(bootstrapSession.fulfilled, (state, { payload }) => {
        if (payload) {
          state.status = "authenticated";
          state.user = payload.user;
          state.token = payload.token;
        } else {
          state.status = "unauthenticated";
        }
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.status = "unauthenticated";
        state.user = null;
        state.token = null;
      });
  },
});

export default authSlice.reducer;
