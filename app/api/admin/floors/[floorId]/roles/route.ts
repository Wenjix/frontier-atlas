import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { getFloorLeads, assignFloorRole } from "@/lib/services/admin-service"
import { assignRoleSchema } from "@/lib/validations/admin"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireAdmin()
    const { floorId } = await params
    const leads = await getFloorLeads(floorId)
    return NextResponse.json({ success: true, data: leads })
  } catch (error) {
    return formatApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireAdmin()
    const { floorId } = await params
    const body = await request.json()
    const { memberId, role } = assignRoleSchema.parse(body)
    const result = await assignFloorRole(memberId, floorId, role)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
