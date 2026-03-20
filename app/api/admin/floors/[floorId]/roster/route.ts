import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { getFloorRoster } from "@/lib/services/admin-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireAdmin()
    const { floorId } = await params
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") ?? undefined
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined
    const roster = await getFloorRoster(floorId, { search, page, pageSize })
    return NextResponse.json({ success: true, data: roster })
  } catch (error) {
    return formatApiError(error)
  }
}
