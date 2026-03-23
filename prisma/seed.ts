import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"
import { floors } from "../lib/floor-data"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const FLOOR_TYPE_MAP = {
  thematic: "THEMATIC",
  commons: "COMMONS",
  private: "PRIVATE",
} as const

async function main() {
  console.log("Seeding floors...")

  for (const floor of floors) {
    await prisma.floor.upsert({
      where: { id: floor.id },
      update: {
        number: floor.number,
        name: floor.name,
        icon: floor.icon,
        nickname: floor.nickname ?? null,
        shortDescription: floor.description,
        description: floor.description,
        character: floor.character ?? null,
        requiredSelfPassId: floor.requiredSelfPassId ?? null,
        floorType: FLOOR_TYPE_MAP[floor.type],
      },
      create: {
        id: floor.id,
        number: floor.number,
        name: floor.name,
        icon: floor.icon,
        nickname: floor.nickname ?? null,
        shortDescription: floor.description,
        description: floor.description,
        character: floor.character ?? null,
        requiredSelfPassId: floor.requiredSelfPassId ?? null,
        floorType: FLOOR_TYPE_MAP[floor.type],
      },
    })
  }
  console.log(`  ✓ ${floors.length} floors seeded`)

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
