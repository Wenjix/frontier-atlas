import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { profilePublishRequirements } from "@/lib/validations/profile"
import { createNotification } from "@/lib/services/notification-service"
import type { z } from "zod"
import type { profileDraftSchema } from "@/lib/validations/profile"

type ProfileDraftInput = z.infer<typeof profileDraftSchema>

export async function getProfile(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      profile: {
        include: { topics: true },
      },
    },
  })

  if (!member) {
    throw new AppError("NOT_FOUND", "Member not found")
  }

  return {
    id: member.id,
    fullName: member.fullName,
    avatarUrl: member.avatarUrl,
    profile: member.profile
      ? {
          ...member.profile,
          topics: member.profile.topics.map((t) => t.topic),
        }
      : null,
  }
}

export async function saveDraft(memberId: string, data: ProfileDraftInput) {
  const { topics, ...profileFields } = data

  await prisma.$transaction(async (tx) => {
    const profile = await tx.memberProfile.update({
      where: { memberId },
      data: profileFields,
    })

    if (topics !== undefined) {
      await tx.memberProfileTopic.deleteMany({
        where: { memberProfileId: profile.id },
      })
      if (topics.length > 0) {
        await tx.memberProfileTopic.createMany({
          data: topics.map((topic) => ({
            memberProfileId: profile.id,
            topic,
          })),
        })
      }
    }
  })

  return getProfile(memberId)
}

export async function publishProfile(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      profile: true,
      memberships: { where: { status: "ACTIVE" } },
    },
  })

  if (!member?.profile) {
    throw new AppError("NOT_FOUND", "Profile not found. Save a draft first.")
  }

  if (!member.fullName || member.fullName.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Full name is required before publishing")
  }

  // Validate all required fields are present
  const parseResult = profilePublishRequirements.safeParse(member.profile)
  if (!parseResult.success) {
    const missing = parseResult.error.errors.map((e) => e.path.join(".")).join(", ")
    throw new AppError("VALIDATION_ERROR", `Missing required fields: ${missing}`)
  }

  // Check active membership on home floor
  const hasActiveMembership = member.memberships.some(
    (m) => m.floorId === member.profile!.homeFloorId
  )
  if (!hasActiveMembership) {
    throw new AppError("FORBIDDEN", "No active membership on your home floor")
  }

  const profile = await prisma.memberProfile.update({
    where: { memberId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  })

  // Create onboarding notification
  await createNotification(memberId, "ONBOARDING_COMPLETED", profile.id)

  return getProfile(memberId)
}

export async function updateProfile(memberId: string, data: ProfileDraftInput) {
  const profile = await prisma.memberProfile.findUnique({
    where: { memberId },
  })

  if (!profile) {
    throw new AppError("NOT_FOUND", "Profile not found")
  }

  if (profile.status !== "PUBLISHED") {
    throw new AppError("VALIDATION_ERROR", "Can only update published profiles. Use draft endpoint instead.")
  }

  const result = await saveDraft(memberId, data)

  // Ensure status remains PUBLISHED after draft save
  await prisma.memberProfile.update({
    where: { memberId },
    data: { status: "PUBLISHED" },
  })

  return result
}
