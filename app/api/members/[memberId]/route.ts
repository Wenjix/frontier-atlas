import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { formatApiError, AppError } from "@/lib/errors"
import { getContextSignal } from "@/lib/services/directory-service"
import { visibilityReverseMap, opennessReverseMap } from "@/lib/enum-maps"
import type { MemberDetail } from "@/lib/member-data"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await requireAuth()
    const { memberId } = await params

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        profile: {
          include: { topics: true },
        },
        memberships: {
          where: { status: "ACTIVE" },
          select: { floorId: true, role: true },
        },
      },
    })

    if (!member || !member.profile || member.profile.status !== "PUBLISHED") {
      throw new AppError("NOT_FOUND", "Member not found or profile not published")
    }

    // Visibility enforcement
    const visibility = member.profile.visibility

    if (visibility === "FLOOR" || visibility === "LEADS_ONLY") {
      // Get requesting user's member record
      const requestingMember = await prisma.member.findUnique({
        where: { userId: user.id },
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            select: { floorId: true, role: true },
          },
        },
      })

      if (!requestingMember) {
        throw new AppError("FORBIDDEN", "You must be a member to view this profile")
      }

      const targetFloorIds = member.memberships.map((m) => m.floorId)
      const requestorFloorIds = requestingMember.memberships.map((m) => m.floorId)
      const sharedFloors = targetFloorIds.filter((id) => requestorFloorIds.includes(id))

      if (visibility === "FLOOR" && sharedFloors.length === 0) {
        throw new AppError("FORBIDDEN", "This profile is only visible to members on the same floor")
      }

      if (visibility === "LEADS_ONLY") {
        const isLeadOnSharedFloor = requestingMember.memberships.some(
          (m) =>
            targetFloorIds.includes(m.floorId) &&
            (m.role === "LEAD" || m.role === "STEWARD")
        )
        if (!isLeadOnSharedFloor) {
          throw new AppError("FORBIDDEN", "This profile is only visible to floor leads")
        }
      }
    }
    // TOWER visibility: any authenticated member can see

    // Get context signal from the member's home floor
    const contextSignal = await getContextSignal(memberId, member.profile.homeFloorId)

    const detail: MemberDetail = {
      id: member.id,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl,
      oneLineIntro: member.profile.oneLineIntro ?? "",
      profileVisibility: visibilityReverseMap[member.profile.visibility],
      introOpenness: opennessReverseMap[member.profile.introOpenness] as MemberDetail["introOpenness"],
      workingOn: member.profile.workingOn,
      curiousAbout: member.profile.curiousAbout,
      wantsToMeet: member.profile.wantsToMeet,
      canHelpWith: member.profile.canHelpWith,
      needsHelpWith: member.profile.needsHelpWith,
      conversationStarter: member.profile.conversationStarter,
      websiteUrl: member.profile.websiteUrl,
      contextSignal,
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    return formatApiError(error)
  }
}
