const TOKEN_KEY = "ss_token";
const LAST_WORKSPACE_KEY = "ss_last_workspace";
const ONE_DAY = 60 * 60 * 24;

const canUseStorage = () => typeof window !== "undefined";

export const readToken = (): string | null =>
  canUseStorage() ? window.localStorage.getItem(TOKEN_KEY) : null;

export const saveToken = (token: string) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  // Mirror to a cookie so proxy.ts can redirect signed-out visitors.
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${ONE_DAY}; samesite=lax`;
};

export const clearToken = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
};

export const readLastWorkspace = (): string | null =>
  canUseStorage() ? window.localStorage.getItem(LAST_WORKSPACE_KEY) : null;

export const saveLastWorkspace = (id: string) => {
  if (canUseStorage()) window.localStorage.setItem(LAST_WORKSPACE_KEY, id);
};
