"use client"

import type { ApiResponse, ApiErrorResponse } from "@/lib/types/api"
import { ApiError } from "@/lib/api-client"

// Module-level token: safe because this file is "use client" and only runs in the
// Telegram Mini App webview (single-page, single-user, no SSR). TelegramProvider
// sets this once on mount via setTelegramToken() after verifying initData.
let _token: string | null = null

export function setTelegramToken(token: string | null) {
  _token = token
}

export function getTelegramToken() {
  return _token
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`
  }

  const options: RequestInit = { method, headers }
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

export const telegramApi = {
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
