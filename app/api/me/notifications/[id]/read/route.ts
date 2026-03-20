import { NextRequest, NextResponse } from "next/server"
import { requireEitherMember } from "@/lib/telegram/dual-auth"
import { formatApiError } from "@/lib/errors"
import { markRead } from "@/lib/services/notification-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { memberId } = await requireEitherMember(request)
    const { id } = await params
    await markRead(memberId, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return formatApiError(error)
  }
}
