import { NextRequest, NextResponse } from "next/server"
import { resolveEnsProfile, resolveEnsAddress } from "@/lib/web3/ens-service"
import { checksumAddress } from "@/lib/web3/address"
import { formatApiError } from "@/lib/errors"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addressOrName: string }> }
) {
  try {
    const { addressOrName } = await params
    let address: string

    if (addressOrName.startsWith("0x") && addressOrName.length === 42) {
      address = checksumAddress(addressOrName)
    } else {
      const resolved = await resolveEnsAddress(addressOrName)
      if (!resolved) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "ENS name not found" } },
          { status: 404 }
        )
      }
      address = resolved
    }

    const profile = await resolveEnsProfile(address)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}
