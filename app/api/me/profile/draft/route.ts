import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { profileDraftSchema } from "@/lib/validations/profile"
import { saveDraft } from "@/lib/services/profile-service"
import { requireEitherMember } from "@/lib/telegram/dual-auth"

export async function PUT(request: NextRequest) {
  try {
    const { memberId } = await requireEitherMember(request)
    const body = await request.json()
    const data = profileDraftSchema.parse(body)
    const profile = await saveDraft(memberId, data)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}
