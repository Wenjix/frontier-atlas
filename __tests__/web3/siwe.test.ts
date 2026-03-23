import { describe, it, expect, vi } from "vitest"

// Test SIWE message construction (extracted from wallet-connect-button.tsx)
function createSiweMessage(
  address: string,
  nonce: string,
  domain: string,
  origin: string,
  issuedAt: Date
): string {
  const expiration = new Date(issuedAt.getTime() + 5 * 60 * 1000)
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Frontier Atlas",
    "",
    `URI: ${origin}`,
    "Version: 1",
    "Chain ID: 1",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiration.toISOString()}`,
  ].join("\n")
}

describe("createSiweMessage", () => {
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  const nonce = "test-nonce-123"
  const domain = "localhost:3000"
  const origin = "http://localhost:3000"
  const now = new Date("2026-03-23T00:00:00Z")

  it("constructs valid EIP-4361 message", () => {
    const message = createSiweMessage(address, nonce, domain, origin, now)

    expect(message).toContain(`${domain} wants you to sign in with your Ethereum account:`)
    expect(message).toContain(address)
    expect(message).toContain("Sign in to Frontier Atlas")
    expect(message).toContain(`URI: ${origin}`)
    expect(message).toContain("Version: 1")
    expect(message).toContain("Chain ID: 1")
    expect(message).toContain(`Nonce: ${nonce}`)
    expect(message).toContain(`Issued At: ${now.toISOString()}`)
  })

  it("sets expiration 5 minutes after issuance", () => {
    const message = createSiweMessage(address, nonce, domain, origin, now)
    const expectedExpiry = new Date(now.getTime() + 5 * 60 * 1000)
    expect(message).toContain(`Expiration Time: ${expectedExpiry.toISOString()}`)
  })

  it("includes all required EIP-4361 fields", () => {
    const message = createSiweMessage(address, nonce, domain, origin, now)
    const lines = message.split("\n")

    // Line 0: domain + header
    expect(lines[0]).toMatch(/wants you to sign in/)
    // Line 1: address
    expect(lines[1]).toBe(address)
    // Line 3: statement
    expect(lines[3]).toBe("Sign in to Frontier Atlas")
    // Remaining fields are key-value pairs
    expect(lines.some(l => l.startsWith("URI:"))).toBe(true)
    expect(lines.some(l => l.startsWith("Version:"))).toBe(true)
    expect(lines.some(l => l.startsWith("Chain ID:"))).toBe(true)
    expect(lines.some(l => l.startsWith("Nonce:"))).toBe(true)
    expect(lines.some(l => l.startsWith("Issued At:"))).toBe(true)
    expect(lines.some(l => l.startsWith("Expiration Time:"))).toBe(true)
  })
})

describe("getWalletErrorMessage", () => {
  function getWalletErrorMessage(error: unknown): string {
    const err = error as { code?: number; message?: string }
    switch (err.code) {
      case 4001:
        return "You declined the request."
      case -32002:
        return "Please check your wallet — a request is pending."
      case -32603:
        return "Wallet encountered an error. Please try again."
      default:
        return err.message ?? "Could not connect to your wallet. Please try again."
    }
  }

  it("handles user rejection (4001)", () => {
    expect(getWalletErrorMessage({ code: 4001 })).toBe("You declined the request.")
  })

  it("handles pending request (-32002)", () => {
    expect(getWalletErrorMessage({ code: -32002 })).toContain("request is pending")
  })

  it("handles internal error (-32603)", () => {
    expect(getWalletErrorMessage({ code: -32603 })).toContain("try again")
  })

  it("uses error message for unknown codes", () => {
    expect(getWalletErrorMessage({ code: 9999, message: "Custom error" })).toBe("Custom error")
  })

  it("provides fallback for no message", () => {
    expect(getWalletErrorMessage({})).toContain("Could not connect")
  })
})
