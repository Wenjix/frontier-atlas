import { describe, it, expect } from "vitest"
import { checksumAddress } from "@/lib/web3/address"

describe("checksumAddress", () => {
  it("converts lowercase address to checksummed", () => {
    const lower = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
    const result = checksumAddress(lower)
    expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
  })

  it("preserves already-checksummed address", () => {
    const checksummed = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    expect(checksumAddress(checksummed)).toBe(checksummed)
  })

  it("handles uppercase address", () => {
    const upper = "0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045"
    const result = checksumAddress(upper)
    expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
  })

  it("throws on invalid address", () => {
    expect(() => checksumAddress("0xinvalid")).toThrow()
    expect(() => checksumAddress("not-an-address")).toThrow()
  })
})
