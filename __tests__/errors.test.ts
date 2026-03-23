import { describe, it, expect } from "vitest"
import { AppError } from "@/lib/errors"

describe("AppError", () => {
  it("creates error with correct code and status", () => {
    const err = new AppError("FORBIDDEN", "Access denied")
    expect(err.code).toBe("FORBIDDEN")
    expect(err.message).toBe("Access denied")
    expect(err.status).toBe(403)
  })

  it("maps all error codes to correct HTTP status", () => {
    const cases: [string, number][] = [
      ["UNAUTHORIZED", 401],
      ["FORBIDDEN", 403],
      ["NOT_FOUND", 404],
      ["VALIDATION_ERROR", 400],
      ["CONFLICT", 409],
      ["RATE_LIMITED", 429],
      ["INTERNAL_ERROR", 500],
    ]

    for (const [code, status] of cases) {
      const err = new AppError(code as Parameters<typeof AppError>[0], "test")
      expect(err.status).toBe(status)
    }
  })

  it("is instanceof Error", () => {
    const err = new AppError("NOT_FOUND", "Missing")
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })
})
