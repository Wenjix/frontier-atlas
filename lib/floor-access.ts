import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { requireEitherMember } from "@/lib/telegram/dual-auth"

export async function requireFloorAccess(
  request: NextRequest,
  floorId: string
) {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    select: { requiredSelfPassId: true },
  })

  // Legacy floor (no gate) — pass through, existing auth is sufficient
  if (!floor?.requiredSelfPassId) return

  // Gated floor — require membership
  const { memberId } = await requireEitherMember(request)

  const membership = await prisma.memberFloorMembership.findUnique({
    where: { memberId_floorId: { memberId, floorId } },
    select: { status: true },
  })

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError(
      "FORBIDDEN",
      "Floor access required. Complete verification to join."
    )
  }
}
