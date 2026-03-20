import { auth } from "@/lib/auth"
import { AppError } from "@/lib/errors"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email) {
    throw new AppError("UNAUTHORIZED", "Not authenticated")
  }
  if (!ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    throw new AppError("FORBIDDEN", "Admin access required")
  }
  return session.user
}
