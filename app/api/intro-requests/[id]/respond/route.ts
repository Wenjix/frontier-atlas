import { NextRequest, NextResponse } from "next/server"
import { requireMember } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"
import { respondIntroRequestSchema } from "@/lib/validations/intro-request"
import { respondToIntroRequest } from "@/lib/services/intro-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { memberId } = await requireMember()
    const { id } = await params
    const body = await request.json()
    const data = respondIntroRequestSchema.parse(body)
    const result = await respondToIntroRequest(memberId, id, data)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
