import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireTelegramAuth } from "@/lib/telegram/telegram-auth-helpers"
import { updateJoinStatus } from "@/lib/services/telegram-link-service"

export async function POST(request: NextRequest) {
  try {
    const { telegramLink } = await requireTelegramAuth(request)
    await updateJoinStatus(telegramLink.id, "CLICKED")
    return NextResponse.json({ success: true, data: { telegramJoinStatus: "CLICKED" } })
  } catch (error) {
    return formatApiError(error)
  }
}
