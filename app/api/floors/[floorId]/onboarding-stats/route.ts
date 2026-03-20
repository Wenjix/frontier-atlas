import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"
import { requireEitherAuth } from "@/lib/telegram/dual-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireEitherAuth(request)
    const { floorId } = await params
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [memberCount, recentJoinCount, recentMembers] = await Promise.all([
      prisma.memberFloorMembership.count({
        where: {
          floorId,
          status: "ACTIVE",
          member: { profile: { status: "PUBLISHED" } },
        },
      }),

      prisma.memberFloorMembership.count({
        where: {
          floorId,
          status: "ACTIVE",
          joinedAt: { gte: sevenDaysAgo },
          member: { profile: { status: "PUBLISHED" } },
        },
      }),

      prisma.memberFloorMembership.findMany({
        where: {
          floorId,
          status: "ACTIVE",
          member: { profile: { status: "PUBLISHED" } },
        },
        orderBy: { joinedAt: "desc" },
        take: 5,
        select: {
          member: {
            select: { fullName: true, avatarUrl: true },
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        memberCount,
        recentJoinCount,
        recentMembers: recentMembers.map((m) => ({
          fullName: m.member.fullName,
          avatarUrl: m.member.avatarUrl,
        })),
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
