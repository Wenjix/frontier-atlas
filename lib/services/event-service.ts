import { prisma } from "@/lib/prisma"

export async function getFloorEvents(
  floorId: string,
  options: { upcoming?: boolean; page?: number; pageSize?: number } = {}
) {
  const { upcoming = false, page = 1, pageSize = 20 } = options
  const skip = (page - 1) * pageSize

  const where = {
    floorId,
    ...(upcoming ? { startsAt: { gt: new Date() }, status: "SCHEDULED" as const } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        host: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: upcoming ? { startsAt: "asc" } : { startsAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function isHostingSoon(memberId: string, floorId?: string): Promise<boolean> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const event = await prisma.event.findFirst({
    where: {
      hostMemberId: memberId,
      ...(floorId ? { floorId } : {}),
      status: "SCHEDULED",
      startsAt: { gte: new Date(), lte: sevenDaysFromNow },
    },
  })
  return !!event
}

export async function getHostingSoonMemberIds(floorId: string): Promise<Set<string>> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const events = await prisma.event.findMany({
    where: {
      floorId,
      status: "SCHEDULED",
      startsAt: { gte: new Date(), lte: sevenDaysFromNow },
    },
    select: { hostMemberId: true },
  })
  return new Set(events.map((e) => e.hostMemberId))
}
