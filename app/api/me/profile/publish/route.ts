import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { publishProfile } from "@/lib/services/profile-service"
import { requireEitherMember } from "@/lib/telegram/dual-auth"

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await requireEitherMember(request)
    const profile = await publishProfile(memberId)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}
