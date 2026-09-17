// Central fetch wrapper — attaches the JWT and unwraps errors consistently.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];

  constructor(status: number, message: string, details?: { field: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string) {
  window.localStorage.setItem("token", token);
}

export function clearToken() {
  window.localStorage.removeItem("token");
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let details: { field: string; message: string }[] | undefined;

    try {
      const data = await res.json();
      if (typeof data.error === "string") message = data.error;
      if (Array.isArray(data.details)) details = data.details;
      else if (data.error && typeof data.error === "object") message = JSON.stringify(data.error);
    } catch {
      // non-JSON error body
    }

    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth")) {
      clearToken();
      window.location.href = "/login";
    }

    throw new ApiError(res.status, message, details);
  }

  return (await res.json()) as T;
}
