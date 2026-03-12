import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { AppError } from "@/lib/errors"
import { requireTelegramAuth } from "@/lib/telegram/telegram-auth-helpers"
import { linkTelegramToAtlasAccount } from "@/lib/services/telegram-link-service"
import { z } from "zod"

const linkAccountSchema = z.object({
  email: z.string().email("Valid email is required"),
  invitationToken: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { telegramLink } = await requireTelegramAuth(request)

    const body = await request.json()
    const { email, invitationToken } = linkAccountSchema.parse(body)

    const result = await linkTelegramToAtlasAccount(
      telegramLink.id,
      email,
      invitationToken
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
