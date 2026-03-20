import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { createNotification } from "@/lib/services/notification-service"
import type { IntroRequestStatus, NotificationType } from "@/lib/generated/prisma/client"
import type { z } from "zod"
import type { createIntroRequestSchema, respondIntroRequestSchema } from "@/lib/validations/intro-request"

type CreateInput = z.infer<typeof createIntroRequestSchema>
type RespondInput = z.infer<typeof respondIntroRequestSchema>

export async function createIntroRequest(requesterMemberId: string, data: CreateInput) {
  const { recipientMemberId, reason, note, preferredConnection, linkUrl } = data

  // 1. Cannot request intro to self
  if (requesterMemberId === recipientMemberId) {
    throw new AppError("VALIDATION_ERROR", "Cannot send an intro request to yourself")
  }

  // 2. Recipient must have published profile
  const recipientProfile = await prisma.memberProfile.findUnique({
    where: { memberId: recipientMemberId },
  })
  if (!recipientProfile || recipientProfile.status !== "PUBLISHED") {
    throw new AppError("NOT_FOUND", "Recipient not found or profile not published")
  }

  // 3. Recipient introOpenness must not be LOW_PROFILE
  if (recipientProfile.introOpenness === "LOW_PROFILE") {
    throw new AppError("FORBIDDEN", "This member is not currently open to intro requests")
  }

  // 4. Visibility check
  if (recipientProfile.visibility === "FLOOR" || recipientProfile.visibility === "LEADS_ONLY") {
    const requesterMemberships = await prisma.memberFloorMembership.findMany({
      where: { memberId: requesterMemberId, status: "ACTIVE" },
      select: { floorId: true, role: true },
    })
    const recipientMemberships = await prisma.memberFloorMembership.findMany({
      where: { memberId: recipientMemberId, status: "ACTIVE" },
      select: { floorId: true },
    })

    const recipientFloorIds = recipientMemberships.map((m) => m.floorId)
    const sharedFloors = requesterMemberships.filter((m) => recipientFloorIds.includes(m.floorId))

    if (recipientProfile.visibility === "FLOOR" && sharedFloors.length === 0) {
      throw new AppError("FORBIDDEN", "You must be on the same floor to send an intro request")
    }
    if (recipientProfile.visibility === "LEADS_ONLY") {
      const isLead = sharedFloors.some((m) => m.role === "LEAD" || m.role === "STEWARD")
      if (!isLead) {
        throw new AppError("FORBIDDEN", "Only floor leads can send intro requests to this member")
      }
    }
  }

  // 5. No existing PENDING request
  const existingPending = await prisma.introRequest.findFirst({
    where: {
      requesterMemberId,
      recipientMemberId,
      status: "PENDING",
    },
  })
  if (existingPending) {
    throw new AppError("CONFLICT", "You already have a pending intro request to this member")
  }

  // 6. Rate limiting: max 5 sent requests in rolling 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCount = await prisma.introRequest.count({
    where: {
      requesterMemberId,
      createdAt: { gte: twentyFourHoursAgo },
    },
  })
  if (recentCount >= 5) {
    throw new AppError("RATE_LIMITED", "You've sent 5 intro requests in the last 24 hours — the maximum. Try again tomorrow.")
  }

  // 7. Cooldown: if previously NOT_NOW or PASSED, 30-day cooldown
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentRejection = await prisma.introRequest.findFirst({
    where: {
      requesterMemberId,
      recipientMemberId,
      status: { in: ["NOT_NOW", "PASSED"] },
      respondedAt: { gte: thirtyDaysAgo },
    },
  })
  if (recentRejection) {
    throw new AppError("CONFLICT", "Please wait 30 days before sending another request to this member")
  }

  // Create the request
  const request = await prisma.introRequest.create({
    data: {
      requesterMemberId,
      recipientMemberId,
      reason,
      note,
      preferredConnection,
      linkUrl: linkUrl ?? null,
    },
  })

  // Notify recipient
  await createNotification(recipientMemberId, "INTRO_REQUEST_RECEIVED", request.id)

  return request
}

const ACTION_TO_NOTIFICATION: Record<string, NotificationType> = {
  ACCEPTED: "INTRO_REQUEST_ACCEPTED",
  NOT_NOW: "INTRO_REQUEST_NOT_NOW",
  PASSED: "INTRO_REQUEST_PASSED",
  ALTERNATE_PATH: "INTRO_REQUEST_ALTERNATE_PATH",
}

export async function respondToIntroRequest(
  respondingMemberId: string,
  requestId: string,
  data: RespondInput
) {
  const request = await prisma.introRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    throw new AppError("NOT_FOUND", "Intro request not found")
  }

  if (request.recipientMemberId !== respondingMemberId) {
    throw new AppError("FORBIDDEN", "You can only respond to intro requests sent to you")
  }

  if (request.status !== "PENDING") {
    throw new AppError("CONFLICT", "This intro request has already been responded to")
  }

  const updated = await prisma.introRequest.update({
    where: { id: requestId },
    data: {
      status: data.action as IntroRequestStatus,
      recipientResponseNote: data.responseNote ?? null,
      alternatePathType: data.alternatePathType ?? null,
      alternatePathUrl: data.alternatePathUrl ?? null,
      respondedAt: new Date(),
    },
  })

  // Notify requester
  const notificationType = ACTION_TO_NOTIFICATION[data.action]
  if (notificationType) {
    await createNotification(request.requesterMemberId, notificationType, request.id)
  }

  return updated
}

export async function getReceivedRequests(
  memberId: string,
  page = 1,
  pageSize = 20
) {
  const skip = (page - 1) * pageSize
  const where = { recipientMemberId: memberId }

  const [items, total] = await Promise.all([
    prisma.introRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            profile: { select: { oneLineIntro: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.introRequest.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getSentRequests(
  memberId: string,
  page = 1,
  pageSize = 20
) {
  const skip = (page - 1) * pageSize
  const where = { requesterMemberId: memberId }

  const [items, total] = await Promise.all([
    prisma.introRequest.findMany({
      where,
      include: {
        recipient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            profile: { select: { oneLineIntro: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.introRequest.count({ where }),
  ])

  return { items, total, page, pageSize }
}
