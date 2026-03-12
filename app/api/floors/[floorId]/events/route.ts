import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError, AppError } from "@/lib/errors"
import { paginationSchema } from "@/lib/validations/common"
import { getFloorEvents } from "@/lib/services/event-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    const { floorId } = await params

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true },
    })
    if (!floor) {
      throw new AppError("NOT_FOUND", "Floor not found")
    }

    const searchParams = request.nextUrl.searchParams

    const { page, pageSize } = paginationSchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    })
    const upcoming = searchParams.get("upcoming") === "true"

    const result = await getFloorEvents(floorId, { upcoming, page, pageSize })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
