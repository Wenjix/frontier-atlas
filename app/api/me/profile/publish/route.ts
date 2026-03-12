import { NextResponse } from "next/server"
import { requireMember } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"
import { publishProfile } from "@/lib/services/profile-service"

export async function POST() {
  try {
    const { memberId } = await requireMember()
    const profile = await publishProfile(memberId)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}
