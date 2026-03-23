import { cookies } from "next/headers"
import * as crypto from "crypto"
import { SiweMessage } from "siwe"
import { verifyMessage } from "viem"
import { checksumAddress } from "./address"

export async function generateNonce(): Promise<string> {
  const nonce = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set("siwe-nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 300, // 5 minutes
    path: "/",
  })
  return nonce
}

export async function verifySiweMessage(
  message: string,
  signature: string,
  expectedNonce: string
): Promise<string> {
  const siweMessage = new SiweMessage(message)

  // Validate nonce matches cookie
  if (siweMessage.nonce !== expectedNonce) {
    throw new Error("Invalid nonce")
  }

  // Validate expiration
  if (
    siweMessage.expirationTime &&
    new Date(siweMessage.expirationTime) < new Date()
  ) {
    throw new Error("Message expired")
  }

  // Validate domain matches
  const expectedDomain = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).host
    : "localhost:3000"
  if (siweMessage.domain !== expectedDomain) {
    throw new Error("Domain mismatch")
  }

  // Cryptographic signature verification via viem
  const valid = await verifyMessage({
    address: siweMessage.address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  })
  if (!valid) throw new Error("Invalid signature")

  return checksumAddress(siweMessage.address)
}
