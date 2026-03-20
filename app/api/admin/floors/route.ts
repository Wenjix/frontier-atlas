import { NextResponse } from "next/server"
import { formatApiError } from "@/lib/errors"
import { requireAdmin } from "@/lib/admin-auth"
import { getAllFloorsAdmin } from "@/lib/services/admin-service"

export async function GET() {
  try {
    await requireAdmin()
    const floors = await getAllFloorsAdmin()
    return NextResponse.json({ success: true, data: floors })
  } catch (error) {
    return formatApiError(error)
  }
}
