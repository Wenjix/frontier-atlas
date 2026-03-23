import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"
import { requireFloorAccess } from "@/lib/floor-access"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    const { floorId } = await params
    await requireFloorAccess(request, floorId)
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    const [activeMembers24h, introsThisWeek, upcomingEvents, newProfiles, totalMembers] =
      await Promise.all([
        // Members with profile activity in last 24h
        prisma.memberFloorMembership.count({
          where: {
            floorId,
            status: "ACTIVE",
            member: {
              profile: {
                status: "PUBLISHED",
                updatedAt: { gte: twentyFourHoursAgo },
              },
            },
          },
        }),

        // Intro requests involving floor members this week
        prisma.introRequest.count({
          where: {
            createdAt: { gte: sevenDaysAgo },
            OR: [
              { requester: { memberships: { some: { floorId, status: "ACTIVE" } } } },
              { recipient: { memberships: { some: { floorId, status: "ACTIVE" } } } },
            ],
          },
        }),

        // Upcoming events on this floor in next 48h
        prisma.event.findMany({
          where: {
            floorId,
            status: "SCHEDULED",
            startsAt: { gte: now, lte: fortyEightHoursFromNow },
          },
          select: {
            id: true,
            title: true,
            startsAt: true,
            host: { select: { fullName: true } },
          },
          orderBy: { startsAt: "asc" },
          take: 3,
        }),

        // New profiles on this floor in last 7 days
        prisma.memberFloorMembership.count({
          where: {
            floorId,
            status: "ACTIVE",
            joinedAt: { gte: sevenDaysAgo },
            member: { profile: { status: "PUBLISHED" } },
          },
        }),

        // Total active members
        prisma.memberFloorMembership.count({
          where: {
            floorId,
            status: "ACTIVE",
            member: { profile: { status: "PUBLISHED" } },
          },
        }),
      ])

    // Build time-aware signals
    const hour = now.getHours()
    let timeContext: "morning" | "afternoon" | "evening"
    if (hour < 12) timeContext = "morning"
    else if (hour < 17) timeContext = "afternoon"
    else timeContext = "evening"

    const signals: string[] = []

    if (activeMembers24h > 0) {
      signals.push(`${activeMembers24h} ${activeMembers24h === 1 ? "person" : "people"} active today`)
    }

    if (introsThisWeek > 0) {
      signals.push(`${introsThisWeek} ${introsThisWeek === 1 ? "intro" : "intros"} this week`)
    }

    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0]
      const eventTime = new Date(nextEvent.startsAt)
      const isToday = eventTime.toDateString() === now.toDateString()
      const isTomorrow =
        eventTime.toDateString() ===
        new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
      const timeStr = isToday ? "today" : isTomorrow ? "tomorrow" : "soon"
      signals.push(`${nextEvent.title} ${timeStr}`)
    }

    if (newProfiles > 0) {
      signals.push(`${newProfiles} new ${newProfiles === 1 ? "member" : "members"} this week`)
    }

    // Build summary
    let summary: string
    if (signals.length === 0) {
      summary =
        timeContext === "morning"
          ? "Quiet morning on this floor. A good time to explore profiles."
          : timeContext === "afternoon"
          ? "Steady energy this afternoon."
          : "Winding down for the evening. Check back tomorrow."
    } else {
      const parts: string[] = []
      if (activeMembers24h > 0) parts.push(`${activeMembers24h} people active`)
      if (upcomingEvents.length > 0) parts.push(`${upcomingEvents.length} upcoming ${upcomingEvents.length === 1 ? "event" : "events"}`)
      if (introsThisWeek > 0) parts.push(`${introsThisWeek} intros this week`)
      summary = parts.join(", ") + "."
    }

    return NextResponse.json({
      success: true,
      data: {
        signals,
        summary,
        timeContext,
        stats: {
          activeMembers24h,
          introsThisWeek,
          newProfiles,
          totalMembers,
          upcomingEventCount: upcomingEvents.length,
        },
        events: upcomingEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt.toISOString(),
          hostName: e.host?.fullName ?? null,
        })),
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
