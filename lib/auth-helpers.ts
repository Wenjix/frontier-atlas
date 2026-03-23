import { auth } from "@/lib/auth"
import { AppError } from "@/lib/errors"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED", "Not authenticated")
  }
  if (!session.user.email && !session.user.walletAddress) {
    throw new AppError("UNAUTHORIZED", "No identity associated with account")
  }
  return session.user
}

export async function requireMember() {
  const user = await requireAuth()
  if (!user.memberId) {
    throw new AppError("FORBIDDEN", "No member profile. Claim your invitation first.")
  }
  return { userId: user.id, memberId: user.memberId }
}
