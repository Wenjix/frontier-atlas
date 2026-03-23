import { auth } from "@/lib/auth"
import { AppError } from "@/lib/errors"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const ADMIN_WALLETS = (process.env.ADMIN_WALLETS ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean)

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED", "Not authenticated")
  }
  const emailMatch = session.user.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())
  const walletMatch = session.user.walletAddress && ADMIN_WALLETS.includes(session.user.walletAddress.toLowerCase())
  if (!emailMatch && !walletMatch) {
    throw new AppError("FORBIDDEN", "Admin access required")
  }
  return session.user
}
