import { NextRequest, NextResponse } from "next/server"
import { requireMember } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"
import { profileDraftSchema } from "@/lib/validations/profile"
import { getProfile, updateProfile } from "@/lib/services/profile-service"

export async function GET() {
  try {
    const { memberId } = await requireMember()
    const profile = await getProfile(memberId)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { memberId } = await requireMember()
    const body = await request.json()
    const data = profileDraftSchema.parse(body)
    const profile = await updateProfile(memberId, data)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}
