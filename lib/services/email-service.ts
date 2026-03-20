import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"

// Singleton transport — reuses the same SMTP config as NextAuth's Nodemailer provider
const transport = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT || 587),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

const fromAddress = process.env.EMAIL_FROM || "noreply@frontieratlas.com"
const isDev = process.env.NODE_ENV === "development"

// ─── Types ───

interface SendEmailParams {
  to: string
  subject: string
  html: string
  /** Optional metadata for logging */
  emailType?: string
  memberId?: string
  floorId?: string
}

interface SendEmailResult {
  success: boolean
  error?: string
}

interface SendBulkEmailParams {
  recipients: string[]
  subject: string
  html: string
  /** Optional metadata for logging */
  emailType?: string
  floorId?: string
}

interface SendBulkEmailResult {
  sent: string[]
  failed: { email: string; error: string }[]
}

// ─── Helpers ───

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function logEmail(params: {
  recipientEmail: string
  memberId?: string
  floorId?: string
  emailType: string
  subject: string
  status: string
  error?: string
}) {
  try {
    await prisma.emailLog.create({ data: params })
  } catch (err) {
    // Logging failures should never break email delivery
    console.error("[email-service] Failed to write EmailLog:", err)
  }
}

// ─── Public API ───

/**
 * Send a single email.
 * In development mode the email is logged to console instead of sent.
 */
export async function sendEmail({
  to,
  subject,
  html,
  emailType = "GENERAL",
  memberId,
  floorId,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    if (isDev) {
      console.log(
        `[email-service][dev] To: ${to} | Subject: ${subject}\n${html}`
      )
      await logEmail({
        recipientEmail: to,
        memberId,
        floorId,
        emailType,
        subject,
        status: "SENT_DEV",
      })
      return { success: true }
    }

    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    })

    await logEmail({
      recipientEmail: to,
      memberId,
      floorId,
      emailType,
      subject,
      status: "SENT",
    })

    return { success: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown email error"

    await logEmail({
      recipientEmail: to,
      memberId,
      floorId,
      emailType,
      subject,
      status: "FAILED",
      error: message,
    })

    console.error(`[email-service] Failed to send email to ${to}:`, message)
    return { success: false, error: message }
  }
}

/**
 * Send an email to multiple recipients individually (not BCC) for error isolation.
 * Emails are batched (10 at a time) with a 1-second delay between batches
 * to avoid overwhelming the SMTP server or hitting rate limits.
 */
export async function sendBulkEmail({
  recipients,
  subject,
  html,
  emailType = "BULK",
  floorId,
}: SendBulkEmailParams): Promise<SendBulkEmailResult> {
  if (recipients.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Recipients list cannot be empty")
  }

  const sent: string[] = []
  const failed: { email: string; error: string }[] = []

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    if (i > 0) {
      await delay(BATCH_DELAY_MS)
    }

    const batch = recipients.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map((email) =>
        sendEmail({ to: email, subject, html, emailType, floorId })
      )
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const email = batch[j]

      if (result.status === "fulfilled" && result.value.success) {
        sent.push(email)
      } else {
        const error =
          result.status === "rejected"
            ? String(result.reason)
            : result.value.error || "Unknown error"
        failed.push({ email, error })
      }
    }
  }

  return { sent, failed }
}
