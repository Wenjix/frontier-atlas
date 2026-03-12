import type { ApiResponse, ApiErrorResponse } from "@/lib/types/api"

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(path, options)

  let json: ApiResponse<T> | ApiErrorResponse
  try {
    json = await res.json()
  } catch {
    throw new ApiError("NETWORK_ERROR", `Server returned ${res.status}`, res.status)
  }

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, res.status)
  }

  return json.data
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body)
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, body)
  },
}
