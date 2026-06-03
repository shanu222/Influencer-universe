import type { ApiFailure, ApiSuccess } from "./response";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  let body: ApiSuccess<T> | ApiFailure | Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    throw new ApiClientError("Invalid JSON response", res.status);
  }

  if (typeof body === "object" && body !== null && "success" in body) {
    if (body.success === false) {
      throw new ApiClientError((body as ApiFailure).message ?? "Request failed", res.status);
    }
    return (body as ApiSuccess<T>).data;
  }

  // Legacy fallback for non-standard responses during migration
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: string }).error)
        : "Request failed";
    throw new ApiClientError(message, res.status);
  }

  return body as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json", ...init?.headers },
  });
  return parseResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function apiMutate<T>(
  path: string,
  body: unknown,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}
