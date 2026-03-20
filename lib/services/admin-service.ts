import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { sendEmail } from "@/lib/services/email-service"
import type { MembershipRole, InvitationStatus } from "@/lib/generated/prisma/client"

// ─── Floor Admin ───

export async function getAllFloorsAdmin() {
  const floors = await prisma.floor.findMany({
    orderBy: { number: "asc" },
    include: {
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
          invitations: { where: { status: "ACCEPTED_PENDING_CLAIM" } },
        },
      },
      memberships: {
        where: {
          status: "ACTIVE",
          role: { in: ["LEAD", "HOST", "STEWARD"] },
        },
        select: { id: true },
      },
    },
  })

  return floors.map((floor) => {
    const { memberships, _count, ...metadata } = floor
    return {
      ...metadata,
      memberCount: _count.memberships,
      leadCount: memberships.length,
      pendingInvitationCount: _count.invitations,
    }
  })
}

export async function getFloorAdmin(floorId: string) {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    include: {
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
          invitations: { where: { status: "ACCEPTED_PENDING_CLAIM" } },
        },
      },
      memberships: {
        where: {
          status: "ACTIVE",
          role: { in: ["LEAD", "HOST", "STEWARD"] },
        },
        select: { id: true },
      },
    },
  })

  if (!floor) {
    throw new AppError("NOT_FOUND", "Floor not found")
  }

  const { memberships, _count, ...metadata } = floor
  return {
    ...metadata,
    memberCount: _count.memberships,
    leadCount: memberships.length,
    pendingInvitationCount: _count.invitations,
  }
}

export async function updateFloorMetadata(
  floorId: string,
  data: {
    name?: string
    icon?: string | null
    nickname?: string | null
    shortDescription?: string | null
    description?: string | null
    tags?: string[]
    bestFor?: string | null
    character?: string | null
    isActive?: boolean
  }
) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId } })
  if (!floor) {
    throw new AppError("NOT_FOUND", "Floor not found")
  }

  return prisma.floor.update({
    where: { id: floorId },
    data,
  })
}

// ─── Floor Roster ───

export async function getFloorRoster(
  floorId: string,
  options: { search?: string; page?: number; pageSize?: number } = {}
) {
  const { search, page = 1, pageSize = 20 } = options

  const where = {
    floorId,
    status: "ACTIVE" as const,
    ...(search
      ? {
          member: {
            fullName: { contains: search, mode: "insensitive" as const },
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.memberFloorMembership.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { joinedAt: "desc" },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            profile: {
              select: { status: true },
            },
          },
        },
      },
    }),
    prisma.memberFloorMembership.count({ where }),
  ])

  return {
    items: items.map((m) => ({
      membershipId: m.id,
      memberId: m.member.id,
      fullName: m.member.fullName,
      avatarUrl: m.member.avatarUrl,
      role: m.role,
      profileStatus: m.member.profile?.status ?? null,
      joinedAt: m.joinedAt,
    })),
    total,
    page,
    pageSize,
  }
}

export async function getFloorLeads(floorId: string) {
  const memberships = await prisma.memberFloorMembership.findMany({
    where: {
      floorId,
      status: "ACTIVE",
      role: { in: ["LEAD", "HOST", "STEWARD"] },
    },
    orderBy: { joinedAt: "asc" },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          profile: {
            select: { canHelpWith: true },
          },
        },
      },
    },
  })

  return memberships.map((m) => ({
    membershipId: m.id,
    memberId: m.member.id,
    fullName: m.member.fullName,
    avatarUrl: m.member.avatarUrl,
    role: m.role,
    helpsWith: m.member.profile?.canHelpWith ?? null,
  }))
}

// ─── Role Management ───

export async function assignFloorRole(
  memberId: string,
  floorId: string,
  role: MembershipRole
) {
  const member = await prisma.member.findUnique({ where: { id: memberId } })
  if (!member) {
    throw new AppError("NOT_FOUND", "Member not found")
  }

  return prisma.memberFloorMembership.upsert({
    where: {
      memberId_floorId: { memberId, floorId },
    },
    update: { role },
    create: {
      memberId,
      floorId,
      role,
      status: "ACTIVE",
    },
  })
}

export async function removeFloorRole(membershipId: string) {
  const membership = await prisma.memberFloorMembership.findUnique({
    where: { id: membershipId },
  })
  if (!membership) {
    throw new AppError("NOT_FOUND", "Membership not found")
  }

  return prisma.memberFloorMembership.update({
    where: { id: membershipId },
    data: { role: "MEMBER" },
  })
}

// ─── Invitations ───

export async function createBatchInvitations(
  emails: string[],
  floorId: string,
  expiresInDays?: number
) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId } })
  if (!floor) {
    throw new AppError("NOT_FOUND", "Floor not found")
  }

  // Find emails that already have a pending invitation for this floor
  const existingInvitations = await prisma.invitation.findMany({
    where: {
      floorId,
      status: "ACCEPTED_PENDING_CLAIM",
      email: { in: emails.map((e) => e.toLowerCase()) },
    },
    select: { email: true },
  })
  const existingEmails = new Set(
    existingInvitations.map((inv) => inv.email.toLowerCase())
  )

  const newEmails = emails.filter(
    (email) => !existingEmails.has(email.toLowerCase())
  )

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined

  // Generate all tokens upfront
  const invitationsToCreate = newEmails.map((email) => {
    const token = crypto.randomBytes(32).toString("hex")
    const inviteTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")
    return { email: email.toLowerCase(), token, inviteTokenHash }
  })

  // Create all invitations atomically
  await prisma.$transaction(
    invitationsToCreate.map((inv) =>
      prisma.invitation.create({
        data: {
          email: inv.email,
          floorId,
          status: "ACCEPTED_PENDING_CLAIM",
          inviteTokenHash: inv.inviteTokenHash,
          ...(expiresAt ? { expiresAt } : {}),
        },
      })
    )
  )

  // Fire-and-forget: send invitation emails without blocking
  const floorName = floor.name
  for (const inv of invitationsToCreate) {
    const claimUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/invitations/claim?token=${inv.token}`

    sendEmail({
      to: inv.email,
      subject: `You're invited to Frontier Atlas`,
      html: `<p>You've been invited to join <strong>${floorName}</strong> on Frontier Atlas.</p>
            <p><a href="${claimUrl}" style="display:inline-block;padding:12px 24px;background:#8B6914;color:white;text-decoration:none;border-radius:8px;">Accept Invitation</a></p>
            <p style="color:#666;font-size:14px;">Or copy this link: ${claimUrl}</p>`,
      emailType: "INVITATION",
      floorId,
    }).catch((err) =>
      console.error(
        `[admin-service] Failed to send invitation email to ${inv.email}:`,
        err
      )
    )
  }

  return invitationsToCreate.map(({ email, token }) => ({ email, token }))
}

export async function getInvitations(
  options: {
    floorId?: string
    status?: InvitationStatus
    page?: number
    pageSize?: number
  } = {}
) {
  const { floorId, status, page = 1, pageSize = 20 } = options

  const where = {
    ...(floorId ? { floorId } : {}),
    ...(status ? { status } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        floor: {
          select: { name: true },
        },
      },
    }),
    prisma.invitation.count({ where }),
  ])

  return {
    items: items.map((inv) => ({
      id: inv.id,
      email: inv.email,
      floorId: inv.floorId,
      floorName: inv.floor.name,
      status: inv.status,
      acceptedAt: inv.acceptedAt,
      claimedAt: inv.claimedAt,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
    total,
    page,
    pageSize,
  }
}

// ─── Member Search ───

export async function searchMembers(query: string) {
  const members = await prisma.member.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 10,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      user: {
        select: { email: true },
      },
    },
  })

  return members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    email: m.user.email,
  }))
}
