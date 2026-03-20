import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { publishProfile } from "@/lib/services/profile-service"
import { requireEitherMember } from "@/lib/telegram/dual-auth"

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await requireEitherMember(request)
    const body = await request.json().catch(() => ({}))
    const mode = body?.mode === "quick" ? "quick" as const : "full" as const
    const profile = await publishProfile(memberId, mode)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return formatApiError(error)
  }
}
