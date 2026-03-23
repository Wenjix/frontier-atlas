import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"
import { AppError } from "@/lib/errors"
import { auth } from "@/lib/auth"

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

    // Optional auth — endpoint is public, membership check is best-effort
    let userHasMembership = false
    try {
      const session = await auth()
      if (session?.user?.id) {
        const member = await prisma.member.findUnique({
          where: { userId: session.user.id },
        })
        if (member) {
          const membership = await prisma.memberFloorMembership.findUnique({
            where: { memberId_floorId: { memberId: member.id, floorId } },
          })
          userHasMembership = membership?.status === "ACTIVE"
        }
      }
    } catch {
      /* not authenticated — that's fine */
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
        isGated: !!floor.requiredSelfPassId,
        userHasMembership,
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
