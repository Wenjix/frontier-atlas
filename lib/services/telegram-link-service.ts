import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import type { TelegramUser } from "@/lib/telegram/types"
import type { TelegramJoinStatus } from "@/lib/generated/prisma/client"

export async function findOrCreateTelegramLink(telegramUser: TelegramUser) {
  return prisma.memberTelegramLink.upsert({
    where: { telegramUserId: BigInt(telegramUser.id) },
    update: {
      telegramUsername: telegramUser.username ?? null,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      photoUrl: telegramUser.photo_url ?? null,
    },
    create: {
      telegramUserId: BigInt(telegramUser.id),
      telegramUsername: telegramUser.username ?? null,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      photoUrl: telegramUser.photo_url ?? null,
    },
  })
}

export async function linkTelegramToAtlasAccount(
  telegramLinkId: string,
  email: string,
  invitationToken?: string
) {
  const link = await prisma.memberTelegramLink.findUnique({
    where: { id: telegramLinkId },
  })
  if (!link) {
    throw new AppError("NOT_FOUND", "Telegram link not found")
  }
  if (link.userId) {
    throw new AppError("CONFLICT", "Telegram account already linked to an Atlas account")
  }

  // Only link to an existing User (one who has already signed in via Auth.js).
  // Never create a new User from an unverified email submitted via Telegram.
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!existingUser && !invitationToken) {
    throw new AppError(
      "NOT_FOUND",
      "No Atlas account found for this email. Sign in on the web first, or provide an invitation token."
    )
  }

  return prisma.$transaction(async (tx) => {
    // If invitation token provided, validate and claim it
    if (invitationToken) {
      const tokenHash = crypto.createHash("sha256").update(invitationToken).digest("hex")
      const invitation = await tx.invitation.findUnique({
        where: { inviteTokenHash: tokenHash },
      })

      if (!invitation) {
        throw new AppError("NOT_FOUND", "Invalid invitation token")
      }
      if (invitation.status !== "ACCEPTED_PENDING_CLAIM") {
        throw new AppError("CONFLICT", "Invitation has already been claimed or is no longer valid")
      }
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new AppError("FORBIDDEN", "This invitation was sent to a different email address")
      }
      if (invitation.expiresAt && invitation.expiresAt < new Date()) {
        throw new AppError("FORBIDDEN", "This invitation has expired")
      }

      // For invitation-based flow, find or create the user
      // (invitation email match serves as verification)
      let user = await tx.user.findUnique({ where: { email: email.toLowerCase() } })
      if (!user) {
        user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            emailVerified: new Date(),
            name: [link.firstName, link.lastName].filter(Boolean).join(" ") || undefined,
            image: link.photoUrl,
          },
        })
      }

      // Link Telegram to user
      await tx.memberTelegramLink.update({
        where: { id: telegramLinkId },
        data: { userId: user.id },
      })

      // Create or find member
      let member = await tx.member.findUnique({ where: { userId: user.id } })
      if (!member) {
        member = await tx.member.create({
          data: {
            userId: user.id,
            fullName: [link.firstName, link.lastName].filter(Boolean).join(" ") || email.split("@")[0],
          },
        })
      }

      // Create membership
      await tx.memberFloorMembership.upsert({
        where: {
          memberId_floorId: { memberId: member.id, floorId: invitation.floorId },
        },
        update: {},
        create: {
          memberId: member.id,
          floorId: invitation.floorId,
          role: "MEMBER",
          status: "ACTIVE",
        },
      })

      // Create draft profile
      await tx.memberProfile.upsert({
        where: { memberId: member.id },
        update: {},
        create: {
          memberId: member.id,
          homeFloorId: invitation.floorId,
          status: "DRAFT",
        },
      })

      // Update invitation
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "CLAIMED", claimedAt: new Date() },
      })

      // Update telegram link with memberId
      await tx.memberTelegramLink.update({
        where: { id: telegramLinkId },
        data: { memberId: member.id },
      })

      return {
        userId: user.id,
        memberId: member.id,
        floorId: invitation.floorId,
        membershipStatus: "active" as const,
      }
    }

    // No invitation — link to existing user (already verified above)
    const user = existingUser!

    // Link Telegram to user
    await tx.memberTelegramLink.update({
      where: { id: telegramLinkId },
      data: { userId: user.id },
    })

    // Check if user already has a member record
    const existingMember = await tx.member.findUnique({
      where: { userId: user.id },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          select: { floorId: true },
          take: 1,
        },
      },
    })

    if (existingMember) {
      await tx.memberTelegramLink.update({
        where: { id: telegramLinkId },
        data: { memberId: existingMember.id },
      })

      return {
        userId: user.id,
        memberId: existingMember.id,
        floorId: existingMember.memberships[0]?.floorId ?? null,
        membershipStatus: "active" as const,
      }
    }

    return {
      userId: user.id,
      memberId: null,
      floorId: null,
      membershipStatus: null,
    }
  })
}

export async function updateJoinStatus(telegramLinkId: string, status: TelegramJoinStatus) {
  return prisma.memberTelegramLink.update({
    where: { id: telegramLinkId },
    data: { telegramJoinStatus: status },
  })
}

export async function setWriteAccess(telegramLinkId: string, granted: boolean) {
  return prisma.memberTelegramLink.update({
    where: { id: telegramLinkId },
    data: { writeAccessGranted: granted },
  })
}
