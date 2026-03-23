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

    // Create or find membership
    const membership = await prisma.memberFloorMembership.upsert({
      where: {
        memberId_floorId: {
          memberId: user.memberId!,
          floorId,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        memberId: user.memberId!,
        floorId,
        role: "MEMBER",
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      success: true,
      data: { memberId: membership.memberId, floorId, membershipStatus: "active" },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
