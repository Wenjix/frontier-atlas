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

  // Seed floors
  for (const floor of floors) {
    await prisma.floor.upsert({
      where: { id: floor.id },
      update: {},
      create: {
        id: floor.id,
        number: floor.number,
        name: floor.name,
        icon: floor.icon,
        shortDescription: floor.description,
        floorType: FLOOR_TYPE_MAP[floor.type],
      },
    })
  }
  console.log(`  ✓ ${floors.length} floors seeded`)

  // Seed test users + members + memberships + published profiles
  const testUsers = [
    {
      email: "maya@example.com",
      name: "Maya Chen",
      fullName: "Maya Chen",
      floorId: "floor-9",
      profile: {
        oneLineIntro: "Designing consumer AI interfaces",
        workingOn: "Building a new AI-powered design tool that helps teams iterate faster on UI prototypes.",
        curiousAbout: "How other founders are thinking about AI-human collaboration in creative workflows.",
        wantsToMeet: "Designers who've shipped AI-native products, and founders building developer tools.",
        canHelpWith: "Product design, AI UX patterns, early-stage startup advice.",
        needsHelpWith: "Finding early adopters, pricing strategy for B2B SaaS.",
        conversationStarter: "I'm hosting a demo feedback session next week!",
        websiteUrl: "https://mayachen.design",
        visibility: "TOWER" as const,
        introOpenness: "VERY_OPEN" as const,
        topics: ["AI", "design", "consumer"],
      },
    },
    {
      email: "alex@example.com",
      name: "Alex Rivera",
      fullName: "Alex Rivera",
      floorId: "floor-9",
      profile: {
        oneLineIntro: "Building ML infrastructure for startups",
        workingOn: "Scalable inference pipelines and model serving for early-stage AI companies.",
        curiousAbout: "Edge deployment, cost-efficient training, and open-source model ecosystems.",
        wantsToMeet: "ML engineers, infra folks, and founders building AI-first products.",
        canHelpWith: "ML ops, infrastructure architecture, scaling challenges.",
        needsHelpWith: "Go-to-market strategy, enterprise sales.",
        conversationStarter: "Just shipped a new inference optimization that cuts latency 40%.",
        websiteUrl: null,
        visibility: "FLOOR" as const,
        introOpenness: "OPEN_IF_RELEVANT" as const,
        topics: ["MLOps", "infrastructure", "scaling"],
      },
    },
    {
      email: "nina@example.com",
      name: "Nina Park",
      fullName: "Nina Park",
      floorId: "floor-9",
      profile: {
        oneLineIntro: "Researching multimodal AI systems",
        workingOn: "Novel architectures for combining vision and language understanding.",
        curiousAbout: "Emergent capabilities, AI safety, and alignment research.",
        wantsToMeet: "Researchers, AI safety people, and founders at the frontier.",
        canHelpWith: "Research methodology, multimodal systems, academic connections.",
        needsHelpWith: "Transitioning from research to product, finding co-founders.",
        conversationStarter: "I'd love to discuss the latest developments in multimodal reasoning.",
        websiteUrl: null,
        visibility: "TOWER" as const,
        introOpenness: "VERY_OPEN" as const,
        topics: ["research", "multimodal", "AI safety"],
      },
    },
  ]

  console.log("Seeding test users...")

  for (const testUser of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      update: {},
      create: {
        email: testUser.email,
        name: testUser.name,
        emailVerified: new Date(),
      },
    })

    const member = await prisma.member.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: testUser.fullName,
      },
    })

    await prisma.memberFloorMembership.upsert({
      where: {
        memberId_floorId: { memberId: member.id, floorId: testUser.floorId },
      },
      update: {},
      create: {
        memberId: member.id,
        floorId: testUser.floorId,
        role: "MEMBER",
        status: "ACTIVE",
      },
    })

    const profile = await prisma.memberProfile.upsert({
      where: { memberId: member.id },
      update: {},
      create: {
        memberId: member.id,
        homeFloorId: testUser.floorId,
        status: "PUBLISHED",
        publishedAt: new Date(),
        oneLineIntro: testUser.profile.oneLineIntro,
        workingOn: testUser.profile.workingOn,
        curiousAbout: testUser.profile.curiousAbout,
        wantsToMeet: testUser.profile.wantsToMeet,
        canHelpWith: testUser.profile.canHelpWith,
        needsHelpWith: testUser.profile.needsHelpWith,
        conversationStarter: testUser.profile.conversationStarter,
        websiteUrl: testUser.profile.websiteUrl,
        visibility: testUser.profile.visibility,
        introOpenness: testUser.profile.introOpenness,
      },
    })

    // Seed topics
    for (const topic of testUser.profile.topics) {
      await prisma.memberProfileTopic.upsert({
        where: {
          memberProfileId_topic: { memberProfileId: profile.id, topic },
        },
        update: {},
        create: {
          memberProfileId: profile.id,
          topic,
        },
      })
    }
  }
  console.log(`  ✓ ${testUsers.length} test users with profiles seeded`)

  // Seed test invitations
  const crypto = await import("crypto")
  const testInvitations = [
    { email: "invited1@example.com", floorId: "floor-9", token: "test-invite-token-1" },
    { email: "invited2@example.com", floorId: "floor-4", token: "test-invite-token-2" },
  ]

  console.log("Seeding test invitations...")

  for (const inv of testInvitations) {
    const tokenHash = crypto.createHash("sha256").update(inv.token).digest("hex")
    await prisma.invitation.upsert({
      where: { inviteTokenHash: tokenHash },
      update: {},
      create: {
        email: inv.email,
        floorId: inv.floorId,
        status: "ACCEPTED_PENDING_CLAIM",
        inviteTokenHash: tokenHash,
      },
    })
  }
  console.log(`  ✓ ${testInvitations.length} test invitations seeded`)

  // Seed sample events from floor data
  console.log("Seeding sample events...")

  const aiFloor = floors.find(f => f.id === "floor-9")
  if (aiFloor) {
    const now = new Date()
    const sampleEvents = [
      { title: "Agent Tooling Office Hours", daysFromNow: 1 },
      { title: "AI Demo Circle", daysFromNow: 2 },
      { title: "Founder Feedback Hour", daysFromNow: 3 },
      { title: "Open Build Lunch", daysFromNow: 5 },
    ]

    for (const evt of sampleEvents) {
      const startsAt = new Date(now.getTime() + evt.daysFromNow * 24 * 60 * 60 * 1000)
      startsAt.setHours(14, 0, 0, 0)

      // Use upsert by checking existing events with same title on same floor
      const existing = await prisma.event.findFirst({
        where: { floorId: "floor-9", title: evt.title },
      })
      if (!existing) {
        await prisma.event.create({
          data: {
            floorId: "floor-9",
            title: evt.title,
            startsAt,
            status: "SCHEDULED",
          },
        })
      }
    }
    console.log(`  ✓ Sample events seeded for floor-9`)
  }

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
