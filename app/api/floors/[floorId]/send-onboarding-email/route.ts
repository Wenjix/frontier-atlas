import { NextRequest, NextResponse } from "next/server"
import { formatApiError, AppError } from "@/lib/errors"
import { requireFloorLead } from "@/lib/floor-lead-auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/services/email-service"
import { buildOnboardingEmail } from "@/lib/email-templates/onboarding"
import { sendOnboardingEmailSchema } from "@/lib/validations/admin"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    const { floorId } = await params
    await requireFloorLead(floorId)

    const body = await request.json()
    const { subject: customSubject, dryRun } =
      sendOnboardingEmailSchema.parse(body)

    // ── Fetch floor ──
    const floor = await prisma.floor.findUnique({ where: { id: floorId } })
    if (!floor) {
      throw new AppError("NOT_FOUND", "Floor not found")
    }

    // ── Fetch active members with published profiles ──
    const memberships = await prisma.memberFloorMembership.findMany({
      where: { floorId, status: "ACTIVE" },
      include: {
        member: {
          include: {
            user: { select: { email: true } },
            profile: { select: { status: true } },
          },
        },
      },
    })

    const eligibleMembers = memberships.filter(
      (m) => m.member.profile?.status === "PUBLISHED"
    )

    // ── Determine already-sent recipients ──
    const alreadySent = await prisma.emailLog.findMany({
      where: {
        floorId,
        emailType: "FLOOR_ONBOARDING",
        status: { in: ["SENT", "SENT_DEV"] },
      },
      select: { recipientEmail: true },
    })
    const alreadySentEmails = new Set(alreadySent.map((e) => e.recipientEmail))

    // ── Build recipient list, skipping already-sent ──
    const recipients = eligibleMembers.filter(
      (m) => !alreadySentEmails.has(m.member.user.email)
    )
    const skipped = eligibleMembers.length - recipients.length

    const subject =
      customSubject ??
      `Welcome to Floor ${floor.number} — ${floor.name} | Frontier Atlas`

    // ── Dry run: return preview without sending ──
    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          recipients: recipients.map((m) => ({
            email: m.member.user.email,
            name: m.member.fullName,
          })),
          total: eligibleMembers.length,
          skipped,
        },
      })
    }

    // ── Send emails individually (each is personalized) ──
    const atlasUrl =
      process.env.NEXTAUTH_URL || "http://localhost:3000"

    let sent = 0
    let failed = 0

    for (const membership of recipients) {
      const { member } = membership
      const html = buildOnboardingEmail({
        memberName: member.fullName,
        floorName: floor.name,
        floorNumber: floor.number,
        floorDescription: floor.shortDescription ?? floor.description ?? "",
        atlasUrl,
      })

      const result = await sendEmail({
        to: member.user.email,
        subject,
        html,
        emailType: "FLOOR_ONBOARDING",
        memberId: member.id,
        floorId,
      })

      if (result.success) {
        sent++
      } else {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      data: { sent, failed, skipped, total: eligibleMembers.length },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
