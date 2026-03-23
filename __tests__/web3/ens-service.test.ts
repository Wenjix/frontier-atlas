import { describe, it, expect } from "vitest"

// Test the sanitizeAvatarUrl logic (extracted for testability)
function sanitizeAvatarUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "https:" || parsed.protocol === "ipfs:") {
      return url
    }
    return null
  } catch {
    return null
  }
}

describe("sanitizeAvatarUrl", () => {
  it("allows HTTPS URLs", () => {
    const url = "https://example.com/avatar.png"
    expect(sanitizeAvatarUrl(url)).toBe(url)
  })

  it("allows IPFS URLs", () => {
    const url = "ipfs://QmHash123abc/avatar.png"
    expect(sanitizeAvatarUrl(url)).toBe(url)
  })

  it("rejects HTTP URLs", () => {
    expect(sanitizeAvatarUrl("http://example.com/avatar.png")).toBeNull()
  })

  it("rejects data URIs", () => {
    expect(sanitizeAvatarUrl("data:image/png;base64,abc123")).toBeNull()
  })

  it("rejects javascript: protocol", () => {
    expect(sanitizeAvatarUrl("javascript:alert(1)")).toBeNull()
  })

  it("returns null for empty/null input", () => {
    expect(sanitizeAvatarUrl(null)).toBeNull()
    expect(sanitizeAvatarUrl("")).toBeNull()
  })

  it("rejects malformed URLs", () => {
    expect(sanitizeAvatarUrl("not a url")).toBeNull()
    expect(sanitizeAvatarUrl("://missing-protocol")).toBeNull()
  })
})
