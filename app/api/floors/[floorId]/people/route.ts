import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"
import { AppError } from "@/lib/errors"
import { paginationSchema } from "@/lib/validations/common"
import { getFloorPeople, getFeaturedMembers } from "@/lib/services/directory-service"
import { requireEitherMember } from "@/lib/telegram/dual-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ floorId: string }> }
) {
  try {
    await requireEitherMember(request)
    const { floorId } = await params
    const searchParams = request.nextUrl.searchParams

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true, number: true, name: true, shortDescription: true },
    })

    if (!floor) {
      throw new AppError("NOT_FOUND", "Floor not found")
    }

    const { page, pageSize } = paginationSchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    })

    const search = searchParams.get("q") ?? undefined

    const [peopleResult, featuredMembers] = await Promise.all([
      getFloorPeople(floorId, { search, page, pageSize }),
      search ? Promise.resolve(undefined) : getFeaturedMembers(floorId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        floor: {
          id: floor.id,
          number: floor.number,
          name: floor.name,
          shortDescription: floor.shortDescription,
        },
        featuredMembers,
        members: peopleResult.items,
        totalCount: peopleResult.total,
      },
    })
  } catch (error) {
    return formatApiError(error)
  }
}
