import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { AppError } from "@/lib/errors"
import { requireTelegramAuth } from "@/lib/telegram/telegram-auth-helpers"
import { setWriteAccess } from "@/lib/services/telegram-link-service"

export async function POST(request: NextRequest) {
  try {
    const { telegramLink } = await requireTelegramAuth(request)

    const body = await request.json()
    if (typeof body.granted !== "boolean") {
      throw new AppError("VALIDATION_ERROR", "granted (boolean) is required")
    }

    await setWriteAccess(telegramLink.id, body.granted)
    return NextResponse.json({ success: true, data: { writeAccessGranted: body.granted } })
  } catch (error) {
    return formatApiError(error)
  }
}
