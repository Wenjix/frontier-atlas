import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import type { NotificationType } from "@/lib/generated/prisma/client"

export async function createNotification(
  memberId: string,
  type: NotificationType,
  entityId: string
) {
  return prisma.notification.create({
    data: { memberId, type, entityId },
  })
}

export async function getNotifications(
  memberId: string,
  options: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}
) {
  const { unreadOnly = false, page = 1, pageSize = 20 } = options
  const skip = (page - 1) * pageSize

  const where = {
    memberId,
    ...(unreadOnly ? { readAt: null } : {}),
  }

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { memberId, readAt: null },
    }),
  ])

  return { items, total, unreadCount, page, pageSize }
}

export async function markRead(memberId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    throw new AppError("NOT_FOUND", "Notification not found")
  }

  if (notification.memberId !== memberId) {
    throw new AppError("FORBIDDEN", "Not your notification")
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}
