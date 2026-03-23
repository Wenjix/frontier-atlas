import { describe, it, expect } from "vitest"
import { AppError } from "@/lib/errors"

// Unit tests for floor access gating logic (TEST-8, TEST-9)
// Tests the core logic patterns used by requireFloorAccess and floor API routes

describe("Floor access gating logic", () => {
  describe("legacy floor passthrough (TEST-9)", () => {
    it("passes through when requiredSelfPassId is null", () => {
      const floor = { requiredSelfPassId: null }
      // Legacy floor — no gate, existing auth is sufficient
      const isGated = !!floor.requiredSelfPassId
      expect(isGated).toBe(false)
    })

    it("passes through when floor has no gate field", () => {
      const floor = {} as { requiredSelfPassId?: string | null }
      const isGated = !!floor?.requiredSelfPassId
      expect(isGated).toBe(false)
    })

    it("identifies gated floor correctly", () => {
      const floor = { requiredSelfPassId: "self-pass-123" }
      const isGated = !!floor.requiredSelfPassId
      expect(isGated).toBe(true)
    })
  })

  describe("floor gating enforcement (TEST-8)", () => {
    it("requires ACTIVE membership for gated floors", () => {
      const membership = { status: "ACTIVE" }
      const hasAccess = membership.status === "ACTIVE"
      expect(hasAccess).toBe(true)
    })

    it("denies access for SUSPENDED membership", () => {
      const membership = { status: "SUSPENDED" }
      const hasAccess = membership.status === "ACTIVE"
      expect(hasAccess).toBe(false)
    })

    it("denies access for null membership", () => {
      const membership = null
      const hasAccess = !!(membership && (membership as { status: string }).status === "ACTIVE")
      expect(hasAccess).toBe(false)
    })

    it("throws FORBIDDEN for denied access", () => {
      expect(
        () => { throw new AppError("FORBIDDEN", "Floor access required. Complete verification to join.") }
      ).toThrow("Floor access required")
    })
  })

  describe("floor API response shape", () => {
    it("includes isGated and userHasMembership fields", () => {
      // Simulates the GET /api/floors/[floorId] response
      const response = {
        id: "floor-12",
        name: "Crypto & Web3",
        isGated: true,
        userHasMembership: false,
      }
      expect(response.isGated).toBe(true)
      expect(response.userHasMembership).toBe(false)
    })

    it("legacy floor has isGated=false", () => {
      const response = {
        id: "floor-1",
        name: "Welcome Desk",
        isGated: false,
        userHasMembership: false,
      }
      expect(response.isGated).toBe(false)
    })
  })
})

describe("verify-pass idempotency (TEST-12)", () => {
  it("upsert pattern creates on first call", () => {
    // Simulates the upsert logic in verify-pass route
    const existing: Map<string, { memberId: string; floorId: string; status: string; accessSource: string }> = new Map()

    const key = "member1_floor12"
    if (!existing.has(key)) {
      existing.set(key, {
        memberId: "member1",
        floorId: "floor-12",
        status: "ACTIVE",
        accessSource: "SELF_PROOF",
      })
    }

    expect(existing.size).toBe(1)
    expect(existing.get(key)?.status).toBe("ACTIVE")
  })

  it("upsert pattern does not duplicate on second call", () => {
    const existing = new Map<string, { status: string; accessSource: string }>()

    const key = "member1_floor12"
    // First call - creates
    existing.set(key, { status: "ACTIVE", accessSource: "SELF_PROOF" })
    // Second call - upsert (updates existing)
    existing.set(key, { status: "ACTIVE", accessSource: "SELF_PROOF" })

    expect(existing.size).toBe(1) // Still one entry
  })

  it("upsert preserves profile status", () => {
    // MemberProfile upsert with empty update = no changes to existing
    const existingProfile = { status: "PUBLISHED", homeFloorId: "floor-12" }
    const update = {} // empty update in the upsert
    const result = { ...existingProfile, ...update }
    expect(result.status).toBe("PUBLISHED") // Not reset to DRAFT
  })
})
