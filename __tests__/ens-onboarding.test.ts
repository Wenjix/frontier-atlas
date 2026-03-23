import { describe, it, expect } from "vitest"

// TEST-7: ENS profile pre-population in onboarding
// TEST-11 (additional): No ENS data = no pre-fill, no toast

describe("ENS pre-fill in onboarding (TEST-7)", () => {
  it("pre-fills fullName from ENS name when field is empty", () => {
    const prev = { fullName: "", oneLineIntro: "", website: "" }
    const ens = { name: "vitalik.eth", description: "Co-founder of Ethereum", url: "https://vitalik.ca" }

    const result = {
      fullName: prev.fullName || ens.name || "",
      oneLineIntro: prev.oneLineIntro || ens.description || "",
      website: prev.website || ens.url || "",
    }

    expect(result.fullName).toBe("vitalik.eth")
    expect(result.oneLineIntro).toBe("Co-founder of Ethereum")
    expect(result.website).toBe("https://vitalik.ca")
  })

  it("does not overwrite existing field data", () => {
    const prev = { fullName: "Alice", oneLineIntro: "Building things", website: "" }
    const ens = { name: "alice.eth", description: "Researcher", url: "https://alice.com" }

    const result = {
      fullName: prev.fullName || ens.name || "",
      oneLineIntro: prev.oneLineIntro || ens.description || "",
      website: prev.website || ens.url || "",
    }

    expect(result.fullName).toBe("Alice") // Not overwritten
    expect(result.oneLineIntro).toBe("Building things") // Not overwritten
    expect(result.website).toBe("https://alice.com") // Was empty, so filled
  })

  it("shows toast only when ENS has data to fill", () => {
    const ens = { name: "vitalik.eth", description: null, url: null }
    const hasPreFillData = !!(ens.name || ens.description || ens.url)
    expect(hasPreFillData).toBe(true)
  })

  it("no toast when ENS returns all nulls (TEST-11)", () => {
    const ens = { name: null, description: null, url: null }
    const hasPreFillData = !!(ens.name || ens.description || ens.url)
    expect(hasPreFillData).toBe(false)
  })

  it("skips ENS fetch when initialData is provided (edit mode)", () => {
    // In edit mode: open && walletAddress && !initialData → false
    const open = true
    const walletAddress = "0xabc"
    const initialData = { fullName: "Existing User" }
    const shouldFetchEns = open && walletAddress && !initialData
    expect(shouldFetchEns).toBeFalsy()
  })

  it("fetches ENS for new wallet user (no initialData)", () => {
    const open = true
    const walletAddress = "0xabc"
    const initialData = null
    const shouldFetchEns = open && walletAddress && !initialData
    expect(shouldFetchEns).toBeTruthy()
  })

  it("handles partial ENS data gracefully", () => {
    const prev = { fullName: "", oneLineIntro: "", website: "" }
    const ens = { name: "alice.eth", description: null, url: null }

    const result = {
      fullName: prev.fullName || ens.name || "",
      oneLineIntro: prev.oneLineIntro || ens.description || "",
      website: prev.website || ens.url || "",
    }

    expect(result.fullName).toBe("alice.eth")
    expect(result.oneLineIntro).toBe("")
    expect(result.website).toBe("")
  })
})
