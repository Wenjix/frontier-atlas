import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"

export async function claimInvitation(userId: string, userEmail: string, token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

  const invitation = await prisma.invitation.findUnique({
    where: { inviteTokenHash: tokenHash },
  })

  if (!invitation) {
    throw new AppError("NOT_FOUND", "Invalid invitation token")
  }

  if (invitation.status !== "ACCEPTED_PENDING_CLAIM") {
    throw new AppError("CONFLICT", "Invitation has already been claimed or is no longer valid")
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError("FORBIDDEN", "This invitation was sent to a different email address")
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    throw new AppError("FORBIDDEN", "This invitation has expired")
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create or find member
    let member = await tx.member.findUnique({ where: { userId } })
    if (!member) {
      member = await tx.member.create({
        data: {
          userId,
          fullName: userEmail.split("@")[0],
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
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
      },
    })

    return {
      memberId: member.id,
      floorId: invitation.floorId,
      membershipStatus: "active" as const,
    }
  })

  return result
}
