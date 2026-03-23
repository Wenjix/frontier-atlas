import { getAddress } from "viem"

export function checksumAddress(address: string): string {
  return getAddress(address)
}
