import { NextRequest, NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { searchMembers } from "@/lib/services/admin-service"
import { searchMembersSchema } from "@/lib/validations/admin"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const q = request.nextUrl.searchParams.get("q") ?? ""
    const { query } = searchMembersSchema.parse({ query: q })
    const members = await searchMembers(query)
    return NextResponse.json({ success: true, data: members })
  } catch (error) {
    return formatApiError(error)
  }
}
