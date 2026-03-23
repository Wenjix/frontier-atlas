import { describe, it, expect, vi, beforeEach } from "vitest"

describe("verifySelfPresentation", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("returns valid in mock mode", async () => {
    vi.stubEnv("SELF_MOCK", "true")
    const { verifySelfPresentation } = await import("@/lib/web3/self-service")
    const result = await verifySelfPresentation("mock-proof", "pass-123")
    expect(result.valid).toBe(true)
    expect(result.address).toBeDefined()
    vi.unstubAllEnvs()
  })

  it("throws without SELF_APP_ID in non-mock mode", async () => {
    vi.stubEnv("SELF_MOCK", "false")
    delete process.env.SELF_APP_ID
    const { verifySelfPresentation } = await import("@/lib/web3/self-service")
    await expect(verifySelfPresentation("proof", "pass-123")).rejects.toThrow(
      "SELF_APP_ID environment variable is required"
    )
    vi.unstubAllEnvs()
  })

  it("mock mode returns checksummed address", async () => {
    vi.stubEnv("SELF_MOCK", "true")
    const { verifySelfPresentation } = await import("@/lib/web3/self-service")
    const result = await verifySelfPresentation("proof", "pass-123")
    expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    vi.unstubAllEnvs()
  })
})
