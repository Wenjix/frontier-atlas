import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireTelegramAuth } from "@/lib/telegram/telegram-auth-helpers"
import { updateJoinStatus } from "@/lib/services/telegram-link-service"

export async function POST(request: NextRequest) {
  try {
    const { telegramLink } = await requireTelegramAuth(request)
    await updateJoinStatus(telegramLink.id, "DISMISSED")
    return NextResponse.json({ success: true, data: { telegramJoinStatus: "DISMISSED" } })
  } catch (error) {
    return formatApiError(error)
  }
}
