import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatApiError } from "@/lib/errors"
import type { FloorType } from "@/lib/generated/prisma/client"

const FLOOR_TYPE_MAP: Record<FloorType, "thematic" | "commons" | "private"> = {
  THEMATIC: "thematic",
  COMMONS: "commons",
  PRIVATE: "private",
}

export async function GET() {
  try {
    const floors = await prisma.floor.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        name: true,
        icon: true,
        nickname: true,
        floorType: true,
        shortDescription: true,
        description: true,
        character: true,
      },
    })

    const mapped = floors.map((floor) => ({
      id: floor.id,
      number: floor.number,
      name: floor.name,
      icon: floor.icon,
      nickname: floor.nickname,
      type: FLOOR_TYPE_MAP[floor.floorType],
      shortDescription: floor.shortDescription,
      description: floor.description,
      character: floor.character,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    return formatApiError(error)
  }
}
