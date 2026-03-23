import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { validateTelegramSession } from "./telegram-session"

type AuthSource = "web" | "telegram"

interface AuthResult {
  userId: string
  memberId: string | null
  source: AuthSource
}

/**
 * Tries Auth.js session first (cookie-based), then falls back to Telegram Bearer token.
 * Works for both web and Telegram clients hitting the same API route.
 */
export async function requireEitherAuth(request: NextRequest): Promise<AuthResult> {
  // Try Auth.js session first (matches original requireAuth email check)
  const session = await auth()
  if (session?.user?.id && (session.user.email || session.user.walletAddress)) {
    return {
      userId: session.user.id,
      memberId: session.user.memberId ?? null,
      source: "web",
    }
  }

  // Fall back to Telegram Bearer token
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const telegramSession = await validateTelegramSession(token)
    if (telegramSession) {
      const link = telegramSession.telegramLink
      // If the telegram link has a userId, look up their memberId
      if (link.userId) {
        const memberId = link.memberId ?? (await prisma.member.findUnique({
          where: { userId: link.userId },
          select: { id: true },
        }))?.id ?? null
        return {
          userId: link.userId,
          memberId,
          source: "telegram",
        }
      }
    }
  }

  throw new AppError("UNAUTHORIZED", "Not authenticated")
}

/**
 * Like requireEitherAuth but additionally requires a memberId from either source.
 */
export async function requireEitherMember(request: NextRequest) {
  const result = await requireEitherAuth(request)
  if (!result.memberId) {
    throw new AppError("FORBIDDEN", "No member profile. Claim your invitation first.")
  }
  return { userId: result.userId, memberId: result.memberId, source: result.source }
}
