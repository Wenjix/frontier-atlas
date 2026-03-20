import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"

/**
 * Require the current user to be a LEAD or STEWARD on the specified floor.
 * Returns the memberId if authorized.
 */
export async function requireFloorLead(floorId: string): Promise<{ memberId: string }> {
  const session = await auth()

  if (!session?.user?.memberId) {
    throw new AppError("UNAUTHORIZED", "You must be signed in")
  }

  const membership = await prisma.memberFloorMembership.findFirst({
    where: {
      memberId: session.user.memberId,
      floorId,
      status: "ACTIVE",
      role: { in: ["LEAD", "STEWARD"] },
    },
  })

  if (!membership) {
    throw new AppError("FORBIDDEN", "You must be a floor lead to perform this action")
  }

  return { memberId: session.user.memberId }
}
