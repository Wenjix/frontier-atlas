import { NextRequest } from "next/server"
import { AppError } from "@/lib/errors"
import { validateTelegramSession } from "./telegram-session"

/**
 * Extracts and validates a Telegram Bearer token from the request.
 * Returns the telegram link with associated user/member info.
 */
export async function requireTelegramAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("UNAUTHORIZED", "Missing Telegram authorization token")
  }

  const token = authHeader.slice(7)
  const session = await validateTelegramSession(token)
  if (!session) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired Telegram session")
  }

  return {
    telegramLink: session.telegramLink,
    telegramUserId: session.telegramLink.telegramUserId,
    userId: session.telegramLink.userId,
    memberId: session.telegramLink.memberId,
  }
}

/**
 * Like requireTelegramAuth but additionally requires a linked member.
 */
export async function requireTelegramMember(request: NextRequest) {
  const result = await requireTelegramAuth(request)
  if (!result.memberId || !result.userId) {
    throw new AppError("FORBIDDEN", "Telegram account not linked to a member. Claim your invitation first.")
  }
  return {
    ...result,
    memberId: result.memberId,
    userId: result.userId,
  }
}
