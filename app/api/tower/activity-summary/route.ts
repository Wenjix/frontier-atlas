import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"

export async function GET() {
  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Aggregate tower-wide stats in parallel
    const [
      totalActiveMembers,
      recentProfiles,
      activeFloorCounts,
      upcomingEvents,
    ] = await Promise.all([
      // Total published profiles
      prisma.memberProfile.count({
        where: { status: "PUBLISHED" },
      }),

      // Profiles published or updated in last 24h
      prisma.memberProfile.count({
        where: {
          status: "PUBLISHED",
          updatedAt: { gte: twentyFourHoursAgo },
        },
      }),

      // Per-floor active member counts
      prisma.memberFloorMembership.groupBy({
        by: ["floorId"],
        where: { status: "ACTIVE", member: { profile: { status: "PUBLISHED" } } },
        _count: { memberId: true },
      }),

      // Upcoming events in next 48h
      prisma.event.count({
        where: {
          status: "SCHEDULED",
          startsAt: {
            gte: now,
            lte: new Date(now.getTime() + 48 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Count floors with at least one active member
    const activeFloorCount = activeFloorCounts.filter((f) => f._count.memberId > 0).length

    // Build floor member count map
    const floorMemberCounts: Record<string, number> = {}
    for (const fc of activeFloorCounts) {
      floorMemberCounts[fc.floorId] = fc._count.memberId
    }

    return NextResponse.json({
      success: true,
      data: {
        totalActiveMembers,
        recentlyActiveCount: recentProfiles,
        activeFloorCount,
        upcomingEventCount: upcomingEvents,
        floorMemberCounts,
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
