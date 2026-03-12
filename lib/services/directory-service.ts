import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"
import { getHostingSoonMemberIds } from "@/lib/services/event-service"
import type { ContextSignal, FeaturedMember, MemberListItem } from "@/lib/member-data"

interface GetFloorPeopleOptions {
  search?: string
  page?: number
  pageSize?: number
}

export async function getFloorPeople(
  floorId: string,
  options: GetFloorPeopleOptions = {}
) {
  const { search, page = 1, pageSize = 20 } = options
  const skip = (page - 1) * pageSize

  const visibilityFilter = { in: ["FLOOR", "TOWER"] as const }
  const searchTerm = search?.trim()

  const where: Prisma.MemberFloorMembershipWhereInput = {
    floorId,
    status: "ACTIVE",
    member: {
      profile: {
        status: "PUBLISHED",
        visibility: visibilityFilter,
      },
      ...(searchTerm
        ? {
            OR: [
              { fullName: { contains: searchTerm, mode: "insensitive" } },
              {
                profile: {
                  OR: [
                    { oneLineIntro: { contains: searchTerm, mode: "insensitive" } },
                    { workingOn: { contains: searchTerm, mode: "insensitive" } },
                    { curiousAbout: { contains: searchTerm, mode: "insensitive" } },
                    { wantsToMeet: { contains: searchTerm, mode: "insensitive" } },
                    { canHelpWith: { contains: searchTerm, mode: "insensitive" } },
                    { needsHelpWith: { contains: searchTerm, mode: "insensitive" } },
                    { topics: { some: { topic: { contains: searchTerm, mode: "insensitive" } } } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
  }

  const [memberships, total, hostingMemberIds] = await Promise.all([
    prisma.memberFloorMembership.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        member: {
          include: {
            profile: {
              select: {
                oneLineIntro: true,
                introOpenness: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.memberFloorMembership.count({ where }),
    getHostingSoonMemberIds(floorId),
  ])

  const enrichedMembers: MemberListItem[] = memberships.map((m) => ({
    id: m.member.id,
    fullName: m.member.fullName,
    avatarUrl: m.member.avatarUrl,
    oneLineIntro: m.member.profile?.oneLineIntro ?? "",
    contextSignal: resolveContextSignal(
      m.member.id,
      hostingMemberIds,
      m.member.profile?.introOpenness ?? null,
      m.joinedAt
    ),
  }))

  return {
    items: enrichedMembers,
    total,
    page,
    pageSize,
  }
}

function resolveContextSignal(
  memberId: string,
  hostingMemberIds: Set<string>,
  introOpenness: string | null,
  joinedAt: Date
): ContextSignal {
  if (hostingMemberIds.has(memberId)) return "hosting_soon"
  if (introOpenness === "VERY_OPEN") return "open_to_meet"

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  if (joinedAt > fourteenDaysAgo) return "new"

  return null
}

export async function getContextSignal(
  memberId: string,
  floorId: string,
  cached?: { introOpenness: string | null; joinedAt: Date }
): Promise<ContextSignal> {
  const hostingMemberIds = await getHostingSoonMemberIds(floorId)

  if (hostingMemberIds.has(memberId)) return "hosting_soon"

  if (cached) {
    if (cached.introOpenness === "VERY_OPEN") return "open_to_meet"
  } else {
    const profile = await prisma.memberProfile.findUnique({
      where: { memberId },
      select: { introOpenness: true },
    })
    if (profile?.introOpenness === "VERY_OPEN") return "open_to_meet"
  }

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  if (cached) {
    if (cached.joinedAt > fourteenDaysAgo) return "new"
  } else {
    const membership = await prisma.memberFloorMembership.findFirst({
      where: { memberId, floorId },
      select: { joinedAt: true },
    })
    if (membership && membership.joinedAt > fourteenDaysAgo) return "new"
  }

  return null
}

export async function getFeaturedMembers(
  floorId: string,
  limit = 3
): Promise<FeaturedMember[]> {
  const [memberships, hostingMemberIds] = await Promise.all([
    prisma.memberFloorMembership.findMany({
      where: {
        floorId,
        status: "ACTIVE",
        member: {
          profile: {
            status: "PUBLISHED",
            visibility: { in: ["FLOOR", "TOWER"] },
          },
        },
      },
      include: {
        member: {
          include: {
            profile: {
              select: { introOpenness: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 20,
    }),
    getHostingSoonMemberIds(floorId),
  ])

  const withSignals: { member: typeof memberships[0]["member"]; signal: NonNullable<ContextSignal> }[] = []

  for (const m of memberships) {
    const signal = resolveContextSignal(
      m.member.id,
      hostingMemberIds,
      m.member.profile?.introOpenness ?? null,
      m.joinedAt
    )
    if (signal) {
      withSignals.push({ member: m.member, signal })
    }
  }

  const signalOrder: Record<string, number> = {
    hosting_soon: 0,
    open_to_meet: 1,
    new: 2,
  }

  withSignals.sort((a, b) => signalOrder[a.signal] - signalOrder[b.signal])

  const signalToReason: Record<string, string> = {
    hosting_soon: "hosting an event soon",
    open_to_meet: "open to meet",
    new: "new to the floor",
  }

  return withSignals.slice(0, limit).map((s) => ({
    id: s.member.id,
    fullName: s.member.fullName,
    avatarUrl: s.member.avatarUrl,
    reason: signalToReason[s.signal],
  }))
}
