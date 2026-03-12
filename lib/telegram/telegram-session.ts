import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const SESSION_DURATION_HOURS = 24

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function createTelegramSession(telegramLinkId: string) {
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)

  await prisma.telegramSession.create({
    data: {
      tokenHash,
      telegramLinkId,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export async function validateTelegramSession(token: string) {
  const tokenHash = hashToken(token)

  const session = await prisma.telegramSession.findUnique({
    where: { tokenHash },
    include: {
      telegramLink: true,
    },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.telegramSession.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return session
}
