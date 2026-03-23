import { NextResponse } from "next/server"
import { generateNonce } from "@/lib/web3/siwe"

export async function GET() {
  const nonce = await generateNonce()
  return NextResponse.json({ nonce })
}
