import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireEitherAuth } from "@/lib/telegram/dual-auth"
import { getFloorLeads } from "@/lib/services/admin-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireEitherAuth(request)
    const { floorId } = await params
    const leads = await getFloorLeads(floorId)
    return NextResponse.json({ success: true, data: leads })
  } catch (error) {
    return formatApiError(error)
  }
}
