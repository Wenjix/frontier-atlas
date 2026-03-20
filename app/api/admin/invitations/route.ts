import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { getInvitations, createBatchInvitations } from "@/lib/services/admin-service"
import { createInvitationsSchema } from "@/lib/validations/admin"
import type { InvitationStatus } from "@/lib/generated/prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const searchParams = request.nextUrl.searchParams
    const floorId = searchParams.get("floorId") ?? undefined
    const status = (searchParams.get("status") as InvitationStatus) ?? undefined
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined
    const invitations = await getInvitations({ floorId, status, page, pageSize })
    return NextResponse.json({ success: true, data: invitations })
  } catch (error) {
    return formatApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { emails, floorId, expiresInDays } = createInvitationsSchema.parse(body)
    const result = await createBatchInvitations(emails, floorId, expiresInDays)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
