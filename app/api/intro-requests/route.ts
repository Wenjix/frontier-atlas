import { NextRequest, NextResponse } from "next/server"
import { requireEitherMember } from "@/lib/telegram/dual-auth"
import { formatApiError } from "@/lib/errors"
import { createIntroRequestSchema } from "@/lib/validations/intro-request"
import { createIntroRequest } from "@/lib/services/intro-service"

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await requireEitherMember(request)
    const body = await request.json()
    const data = createIntroRequestSchema.parse(body)
    const result = await createIntroRequest(memberId, data)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
