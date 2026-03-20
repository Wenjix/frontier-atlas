import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { removeFloorRole } from "@/lib/services/admin-service"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ floorId: string; membershipId: string }> }
) {
  try {
    await requireAdmin()
    const { membershipId } = await params
    await removeFloorRole(membershipId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return formatApiError(error)
  }
}
