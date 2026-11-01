import { readToken } from "./storage";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export class ApiError extends Error {
  status: number;
  fieldErrors: { field: string; message: string }[];

  constructor(
    message: string,
    status: number,
    fieldErrors: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let token: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const setAuthToken = (value: string | null) => {
  token = value;
};

export const getAuthToken = () => token ?? readToken();

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

/**
 * The API returns Mongoose documents in places (`_id`) and plain objects in
 * others (`id`). Normalise everything to `id` so the rest of the app has one shape.
 */
export const normalize = <T,>(value: unknown): T => {
  if (Array.isArray(value)) return value.map((item) => normalize(item)) as T;

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value)) {
      if (key === "__v") continue;
      result[key === "_id" ? "id" : key] = normalize(child);
    }

    return result as T;
  }

  return value as T;
};

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  query?: Query;
}

const buildUrl = (path: string, query?: Query) => {
  const url = new URL(`${API_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
};

export async function api<T = unknown>(
  path: string,
  { method = "GET", body, formData, query }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const authToken = getAuthToken();

  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check your connection and that the API is running.",
      0,
    );
  }

  let payload: {
    success?: boolean;
    message?: string;
    data?: unknown;
    errors?: { field: string; message: string }[];
  } | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    if (response.status === 401 && authToken) {
      unauthorizedHandler?.();
    }

    throw new ApiError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.errors ?? [],
    );
  }

  return normalize<T>(payload?.data ?? null);
}

export const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.fieldErrors.length > 0) {
      return error.fieldErrors
        .map((item) => (item.field ? `${item.field}: ${item.message}` : item.message))
        .join(" · ");
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong";
};
