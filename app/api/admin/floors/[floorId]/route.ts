import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { getFloorAdmin, updateFloorMetadata } from "@/lib/services/admin-service"
import { updateFloorSchema } from "@/lib/validations/admin"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireAdmin()
    const { floorId } = await params
    const floor = await getFloorAdmin(floorId)
    return NextResponse.json({ success: true, data: floor })
  } catch (error) {
    return formatApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireAdmin()
    const { floorId } = await params
    const body = await request.json()
    const data = updateFloorSchema.parse(body)
    const floor = await updateFloorMetadata(floorId, data)
    return NextResponse.json({ success: true, data: floor })
  } catch (error) {
    return formatApiError(error)
  }
}
