import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMember } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"

export async function GET(request: NextRequest) {
  try {
    const { memberId } = await requireMember()
    const { searchParams } = new URL(request.url)
    const floorId = searchParams.get("floorId")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "3"), 10)

    // Get the current member's profile topics
    const currentMember = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        profile: {
          include: { topics: { select: { topic: true } } },
        },
        memberships: {
          where: { status: "ACTIVE" },
          select: { floorId: true },
        },
      },
    })

    const currentTopics = currentMember?.profile?.topics.map((t) => t.topic) ?? []
    const currentFloorIds = currentMember?.memberships.map((m) => m.floorId) ?? []

    // Build where clause: find published members who share floors or topics
    const targetFloorId = floorId ?? (currentFloorIds[0] || undefined)

    const candidates = await prisma.member.findMany({
      where: {
        id: { not: memberId },
        profile: {
          status: "PUBLISHED",
          visibility: { in: ["FLOOR", "TOWER"] },
          ...(currentTopics.length > 0
            ? { topics: { some: { topic: { in: currentTopics } } } }
            : {}),
        },
        ...(targetFloorId
          ? { memberships: { some: { floorId: targetFloorId, status: "ACTIVE" } } }
          : {}),
      },
      include: {
        profile: {
          select: {
            oneLineIntro: true,
            workingOn: true,
            topics: { select: { topic: true } },
          },
        },
      },
      take: limit * 2, // fetch extra for dedup
      orderBy: { createdAt: "desc" },
    })

    // Score and sort by topic overlap
    const currentTopicSet = new Set(currentTopics.map((t) => t.toLowerCase()))
    const scored = candidates.map((c) => {
      const memberTopics = c.profile?.topics.map((t) => t.topic.toLowerCase()) ?? []
      const overlap = memberTopics.filter((t) => currentTopicSet.has(t)).length
      return { member: c, overlap }
    })
    scored.sort((a, b) => b.overlap - a.overlap)

    const suggestions = scored.slice(0, limit).map((s) => ({
      id: s.member.id,
      fullName: s.member.fullName,
      avatarUrl: s.member.avatarUrl,
      oneLineIntro: s.member.profile?.oneLineIntro ?? "",
      workingOn: s.member.profile?.workingOn ?? null,
      sharedTopicCount: s.overlap,
    }))

    // Also get upcoming events on the relevant floor
    const events = targetFloorId
      ? await prisma.event.findMany({
          where: {
            floorId: targetFloorId,
            status: "SCHEDULED",
            startsAt: { gte: new Date() },
          },
          select: {
            id: true,
            title: true,
            startsAt: true,
            floor: { select: { number: true, name: true } },
          },
          orderBy: { startsAt: "asc" },
          take: 2,
        })
      : []

    return NextResponse.json({
      success: true,
      data: {
        people: suggestions,
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt.toISOString(),
          floorNumber: e.floor.number,
          floorName: e.floor.name,
        })),
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
