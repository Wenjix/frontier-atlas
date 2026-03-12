import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMember } from "@/lib/auth-helpers"
import { formatApiError } from "@/lib/errors"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId: currentMemberId } = await requireMember()
    const { memberId: targetMemberId } = await params

    // Fetch both members' profiles and memberships in parallel
    const [currentMember, targetMember] = await Promise.all([
      prisma.member.findUnique({
        where: { id: currentMemberId },
        include: {
          profile: {
            include: { topics: { select: { topic: true } } },
          },
          memberships: {
            where: { status: "ACTIVE" },
            include: { floor: { select: { id: true, number: true, name: true } } },
          },
        },
      }),
      prisma.member.findUnique({
        where: { id: targetMemberId },
        include: {
          profile: {
            include: { topics: { select: { topic: true } } },
          },
          memberships: {
            where: { status: "ACTIVE" },
            include: { floor: { select: { id: true, number: true, name: true } } },
          },
        },
      }),
    ])

    if (!currentMember?.profile || !targetMember?.profile) {
      return NextResponse.json({
        success: true,
        data: { sharedTopics: [], complementaryNeeds: [], sharedFloors: [], suggestedReason: null, sentenceStarter: null },
      })
    }

    // Shared topics
    const currentTopics = new Set(currentMember.profile.topics.map((t) => t.topic.toLowerCase()))
    const targetTopics = targetMember.profile.topics.map((t) => t.topic)
    const sharedTopics = targetTopics.filter((t) => currentTopics.has(t.toLowerCase()))

    // Complementary needs: your canHelpWith overlaps their needsHelpWith, and vice versa
    const complementaryNeeds: { type: "you_can_help" | "they_can_help"; excerpt: string }[] = []

    if (currentMember.profile.canHelpWith && targetMember.profile.needsHelpWith) {
      complementaryNeeds.push({
        type: "you_can_help",
        excerpt: targetMember.profile.needsHelpWith.slice(0, 120),
      })
    }

    if (targetMember.profile.canHelpWith && currentMember.profile.needsHelpWith) {
      complementaryNeeds.push({
        type: "they_can_help",
        excerpt: targetMember.profile.canHelpWith.slice(0, 120),
      })
    }

    // Shared floors
    const currentFloorIds = new Set(currentMember.memberships.map((m) => m.floorId))
    const sharedFloors = targetMember.memberships
      .filter((m) => currentFloorIds.has(m.floorId))
      .map((m) => ({ id: m.floor.id, number: m.floor.number, name: m.floor.name }))

    // Suggest a reason based on context
    let suggestedReason: string | null = null
    if (complementaryNeeds.length > 0) {
      suggestedReason = "collaboration"
    } else if (sharedTopics.length > 0) {
      suggestedReason = "shared-interest"
    }

    // Build sentence starter
    let sentenceStarter: string | null = null
    if (sharedFloors.length > 0 && targetMember.profile.needsHelpWith) {
      const floorRef = `Floor ${sharedFloors[0].number}`
      sentenceStarter = `We're both on ${floorRef}, and I noticed you're looking for help with "${targetMember.profile.needsHelpWith.slice(0, 60)}..." \u2014 I've been working on...`
    } else if (sharedTopics.length > 0) {
      sentenceStarter = `We both share an interest in ${sharedTopics[0]} \u2014 I've been...`
    } else if (sharedFloors.length > 0) {
      sentenceStarter = `We're both on Floor ${sharedFloors[0].number} \u2014 I noticed your work on "${targetMember.profile.workingOn?.slice(0, 60) ?? "..."}" and...`
    }

    return NextResponse.json({
      success: true,
      data: {
        sharedTopics,
        complementaryNeeds,
        sharedFloors,
        suggestedReason,
        sentenceStarter,
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
