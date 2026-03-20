import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { validateTelegramInitData } from "@/lib/telegram/validate-init-data"
import { createTelegramSession } from "@/lib/telegram/telegram-session"
import { findOrCreateTelegramLink } from "@/lib/services/telegram-link-service"

// Simple in-memory rate limiter: max 5 calls per 60s per Telegram user ID
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

function checkRateLimit(telegramUserId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(telegramUserId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(telegramUserId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData || typeof initData !== "string") {
      throw new AppError("VALIDATION_ERROR", "initData is required")
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      throw new AppError("INTERNAL_ERROR", "Telegram bot token not configured")
    }

    const parsed = validateTelegramInitData(initData, botToken)
    if (!parsed) {
      throw new AppError("UNAUTHORIZED", "Invalid or expired Telegram initData")
    }

    const { user } = parsed

    // Rate limit per Telegram user
    if (!checkRateLimit(String(user.id))) {
      throw new AppError("RATE_LIMITED", "Too many verification attempts. Try again shortly.")
    }

    // Use shared service to upsert MemberTelegramLink
    const telegramLink = await findOrCreateTelegramLink(user)

    // Create session
    const { token, expiresAt } = await createTelegramSession(telegramLink.id)

    // Look up profile status if member exists
    let profileStatus: string | null = null
    if (telegramLink.memberId) {
      const profile = await prisma.memberProfile.findUnique({
        where: { memberId: telegramLink.memberId },
        select: { status: true },
      })
      profileStatus = profile?.status ?? null
    }

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
          telegramUserId: telegramLink.telegramUserId.toString(),
          userId: telegramLink.userId,
          memberId: telegramLink.memberId,
          telegramJoinStatus: telegramLink.telegramJoinStatus,
          profileStatus,
        },
        startParam: parsed.start_param ?? null,
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
