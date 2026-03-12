import { NextRequest, NextResponse } from "next/server"
import { requireMember } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"
import { markRead } from "@/lib/services/notification-service"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { memberId } = await requireMember()
    const { id } = await params
    await markRead(memberId, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return formatApiError(error)
  }
}
