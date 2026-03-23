import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { formatApiError, AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { verifySelfPresentation } from "@/lib/web3/self-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    const user = await requireAuth()
    const { floorId } = await params
    const { proof } = await request.json()

    if (!proof) {
      throw new AppError("VALIDATION_ERROR", "Proof is required")
    }

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true, requiredSelfPassId: true },
    })

    if (!floor) {
      throw new AppError("NOT_FOUND", "Floor not found")
    }

    if (!floor.requiredSelfPassId) {
      throw new AppError("VALIDATION_ERROR", "This floor does not require verification")
    }

    const result = await verifySelfPresentation(proof, floor.requiredSelfPassId)
    if (!result.valid) {
      throw new AppError("FORBIDDEN", "Verification failed")
    }

    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Find or create Member
      let member = await tx.member.findUnique({ where: { userId: user.id } })
      if (!member) {
        member = await tx.member.create({
          data: {
            userId: user.id,
            fullName: user.ensName ?? user.email?.split("@")[0] ?? "Anonymous",
          },
        })
      }

      // 2. Upsert MemberFloorMembership
      await tx.memberFloorMembership.upsert({
        where: { memberId_floorId: { memberId: member.id, floorId } },
        update: { status: "ACTIVE", accessSource: "SELF_PROOF" },
        create: {
          memberId: member.id,
          floorId,
          role: "MEMBER",
          status: "ACTIVE",
          accessSource: "SELF_PROOF",
        },
      })

      // 3. Upsert MemberProfile (draft, only if no existing profile)
      await tx.memberProfile.upsert({
        where: { memberId: member.id },
        update: {},
        create: {
          memberId: member.id,
          homeFloorId: floorId,
          status: "DRAFT",
        },
      })

      return { memberId: member.id }
    })

    return NextResponse.json({
      success: true,
      data: { memberId: txResult.memberId, floorId, membershipStatus: "active" },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
