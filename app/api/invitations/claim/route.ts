import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"
import { claimInvitationSchema } from "@/lib/validations/invitation"
import { claimInvitation } from "@/lib/services/invitation-service"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { token } = claimInvitationSchema.parse(body)
    const result = await claimInvitation(user.id, user.email, token)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
