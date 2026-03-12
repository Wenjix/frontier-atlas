import { NextResponse } from "next/server"
import { ZodError } from "zod"

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL_ERROR"

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = STATUS_MAP[code]
  ) {
    super(message)
  }
}

export function formatApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") } },
      { status: 400 }
    )
  }
  console.error("Unhandled error:", error)
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  )
}
