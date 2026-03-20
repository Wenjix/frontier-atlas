import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireTelegramAuth } from "@/lib/telegram/telegram-auth-helpers"
import { createMemberFromTelegram } from "@/lib/services/telegram-link-service"
import { z } from "zod"

const bodySchema = z.object({
  floorId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { telegramLink } = await requireTelegramAuth(request)

    if (telegramLink.memberId) {
      return NextResponse.json({
        success: true,
        data: {
          userId: telegramLink.userId,
          memberId: telegramLink.memberId,
          alreadyExisted: true,
        },
      })
    }

    const body = await request.json()
    const { floorId } = bodySchema.parse(body)

    const result = await createMemberFromTelegram(telegramLink.id, floorId)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
