import { NextRequest, NextResponse } from "next/server"
import { requireEitherMember } from "@/lib/telegram/dual-auth"
import { formatApiError } from "@/lib/errors"
import { paginationSchema } from "@/lib/validations/common"
import { getNotifications } from "@/lib/services/notification-service"

export async function GET(request: NextRequest) {
  try {
    const { memberId } = await requireEitherMember(request)
    const searchParams = request.nextUrl.searchParams

    const { page, pageSize } = paginationSchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    })
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const result = await getNotifications(memberId, { unreadOnly, page, pageSize })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
