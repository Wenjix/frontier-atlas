import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"
import { AppError } from "@/lib/errors"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    const { floorId } = await params

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: {
        _count: {
          select: {
            memberships: { where: { status: "ACTIVE" } },
            events: { where: { startsAt: { gt: new Date() }, status: "SCHEDULED" } },
          },
        },
      },
    })

    if (!floor) {
      throw new AppError("NOT_FOUND", "Floor not found")
    }

    return NextResponse.json({
      success: true,
      data: {
        id: floor.id,
        number: floor.number,
        name: floor.name,
        icon: floor.icon,
        shortDescription: floor.shortDescription,
        floorType: floor.floorType,
        isActive: floor.isActive,
        memberCount: floor._count.memberships,
        upcomingEventCount: floor._count.events,
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
