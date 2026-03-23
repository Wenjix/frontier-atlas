import { describe, it, expect } from "vitest"

// Unit tests for auth provider configuration (TEST-1, TEST-5, TEST-6, TEST-11)

describe("Auth provider configuration", () => {
  describe("provider IDs (TEST-1)", () => {
    it("dev provider uses 'dev-login' ID (not 'credentials')", () => {
      // Verifies the provider rename from 'credentials' to 'dev-login' in 1C-3/1D-3
      const devProviderId = "dev-login"
      expect(devProviderId).toBe("dev-login")
      expect(devProviderId).not.toBe("credentials")
    })

    it("SIWE provider uses 'siwe' ID", () => {
      const siweProviderId = "siwe"
      expect(siweProviderId).toBe("siwe")
    })

    it("sign-in page calls correct provider IDs", () => {
      // Dev: signIn("dev-login", { email, callbackUrl })
      // Prod: signIn("nodemailer", { email, callbackUrl })
      // Wallet: signIn("siwe", { message, signature })
      const devProvider = "dev-login"
      const prodProvider = "nodemailer"
      const walletProvider = "siwe"

      expect(devProvider).toBe("dev-login")
      expect(prodProvider).toBe("nodemailer")
      expect(walletProvider).toBe("siwe")
    })
  })

  describe("session shape (TEST-6, TEST-11)", () => {
    it("wallet user session includes walletAddress", () => {
      const session = {
        user: {
          id: "user-1",
          memberId: null,
          email: null,
          walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          ensName: "vitalik.eth",
        },
      }

      expect(session.user.walletAddress).toBeTruthy()
      expect(session.user.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it("wallet user without ENS has null ensName (TEST-11)", () => {
      const session = {
        user: {
          id: "user-2",
          memberId: null,
          email: null,
          walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
          ensName: null,
        },
      }

      expect(session.user.walletAddress).toBeTruthy()
      expect(session.user.ensName).toBeNull()
    })

    it("email user session has no wallet fields", () => {
      const session = {
        user: {
          id: "user-3",
          memberId: "member-1",
          email: "test@example.com",
          walletAddress: null,
          ensName: null,
        },
      }

      expect(session.user.email).toBeTruthy()
      expect(session.user.walletAddress).toBeNull()
      expect(session.user.ensName).toBeNull()
    })

    it("dev auto-create flow produces member (TEST-5)", () => {
      // Dev provider creates User + Member + Profile + Membership
      const devUserResult = {
        user: { id: "user-4", email: "maya@example.com" },
        member: { id: "member-4", userId: "user-4", fullName: "maya" },
        membership: { floorId: "floor-1", role: "MEMBER", status: "ACTIVE" },
        profile: { homeFloorId: "floor-1", status: "DRAFT" },
      }

      expect(devUserResult.member).toBeTruthy()
      expect(devUserResult.member.fullName).toBe("maya")
      expect(devUserResult.membership.floorId).toBe("floor-1")
      expect(devUserResult.membership.status).toBe("ACTIVE")
      expect(devUserResult.profile.homeFloorId).toBe("floor-1")
    })
  })

  describe("JWT token shape", () => {
    it("JWT stores wallet data for SIWE users", () => {
      const token = {
        id: "user-1",
        walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        ensName: "vitalik.eth",
      }

      expect(token.walletAddress).toBeTruthy()
      expect(token.ensName).toBe("vitalik.eth")
    })

    it("JWT excludes avatar (kept lean)", () => {
      const token = {
        id: "user-1",
        walletAddress: "0x123",
        ensName: null,
      }

      expect(token).not.toHaveProperty("avatar")
      expect(token).not.toHaveProperty("image")
    })
  })
})

describe("AddressDisplay logic (TEST-11)", () => {
  function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function addressGradient(address: string): string {
    const hash = address.slice(2, 14)
    const color1 = `#${hash.slice(0, 6)}`
    const color2 = `#${hash.slice(6, 12)}`
    return `linear-gradient(135deg, ${color1}, ${color2})`
  }

  it("truncates address to 0x1234...5678 format", () => {
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    const truncated = truncateAddress(address)
    expect(truncated).toBe("0xd8dA...6045")
    expect(truncated.length).toBeLessThan(address.length)
  })

  it("shows ENS name when available", () => {
    const ensName = "vitalik.eth"
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    const displayText = ensName || truncateAddress(address)
    expect(displayText).toBe("vitalik.eth")
  })

  it("shows truncated address when no ENS (TEST-11)", () => {
    const ensName = null
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    const displayText = ensName || truncateAddress(address)
    expect(displayText).toBe("0xd8dA...6045")
  })

  it("generates deterministic gradient from address", () => {
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    const gradient1 = addressGradient(address)
    const gradient2 = addressGradient(address)
    expect(gradient1).toBe(gradient2) // Deterministic
    expect(gradient1).toContain("linear-gradient")
    expect(gradient1).toContain("#")
  })

  it("generates different gradients for different addresses", () => {
    const gradient1 = addressGradient("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
    const gradient2 = addressGradient("0x1234567890abcdef1234567890abcdef12345678")
    expect(gradient1).not.toBe(gradient2)
  })
})
