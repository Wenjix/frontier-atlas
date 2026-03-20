export type FloorType = "thematic" | "commons" | "private"

export interface FloorDefinition {
  id: string
  number: string
  name: string
  icon: string
  type: FloorType
  description: string
  nickname?: string
  tags: string[]
  bestFor: string
  character?: string
}

export const floors: FloorDefinition[] = [
  {
    id: "basement",
    number: "B",
    name: "Basement",
    icon: "⚙️",
    type: "commons",
    description: "Workshop and utilities space. The building's engine room.",
    tags: ["workshop", "utilities", "storage", "building systems"],
    bestFor: "Workshop access, building utilities, storage",
  },
  {
    id: "floor-1",
    number: "1",
    name: "Welcome Desk",
    icon: "🏠",
    type: "commons",
    description: "Your starting point. Meet the community, find your way, begin your journey.",
    tags: ["welcome", "orientation", "onboarding", "introductions", "navigation"],
    bestFor: "New members, first visits, finding your way",
  },
  {
    id: "floor-2a",
    number: "2A",
    name: "Event & Hackathon Space",
    icon: "🛸",
    type: "commons",
    nickname: "The Spaceship",
    description: "300-person industrial space with high ceilings and top-tier AV equipment.",
    tags: ["events", "hackathons", "demos", "performances"],
    bestFor: "Large events, hackathons, demo days, pitches",
  },
  {
    id: "floor-2b",
    number: "2B",
    name: "Private Offices (Lower)",
    icon: "🏢",
    type: "private",
    description: "For when ideas evolve into businesses. Offices for growing teams.",
    tags: ["private", "dedicated", "teams"],
    bestFor: "Resident teams needing dedicated space",
  },
  {
    id: "floor-3",
    number: "3",
    name: "Private Offices",
    icon: "🏢",
    type: "private",
    description: "For when ideas evolve into businesses. Offices for teams up to 20 people.",
    tags: ["private", "dedicated", "teams"],
    bestFor: "Resident teams needing dedicated space",
  },
  {
    id: "floor-4",
    number: "4",
    name: "Robotics & Hard Tech",
    icon: "🤖",
    type: "thematic",
    description: "Next-gen robotics, advanced hardware, and breakthrough materials development.",
    tags: ["robotics", "hardware", "automation", "materials"],
    bestFor: "Technical builders, hardware prototyping, embedded systems",
  },
  {
    id: "floor-5",
    number: "5",
    name: "Movement & Fitness",
    icon: "🏋️",
    type: "commons",
    description: "Gym, yoga, sauna, and cold plunge for mental and physical well-being.",
    tags: ["fitness", "wellness", "yoga", "sauna"],
    bestFor: "Movement breaks, wellness, informal connections",
  },
  {
    id: "floor-6",
    number: "6",
    name: "Arts & Music",
    icon: "🎶",
    type: "thematic",
    description: "Creative expression through immersive experiences, digital installations, and cross-disciplinary projects.",
    tags: ["art", "music", "creative", "installations"],
    bestFor: "Artists, musicians, creative collaborations",
  },
  {
    id: "floor-7",
    number: "7",
    name: "Frontier Maker Space",
    icon: "🔧",
    type: "thematic",
    description: "Lasercutters, CNC machines, woodwork, 3D printers, and microelectronics workshop.",
    tags: ["prototyping", "3D printing", "fabrication", "CNC"],
    bestFor: "Physical prototyping, fabrication, learning tools",
  },
  {
    id: "floor-8",
    number: "8",
    name: "Neuro & Biotech",
    icon: "🧬",
    type: "thematic",
    description: "BSL-2 lab for gene editing, synthetic biology, and personalized medicine breakthroughs.",
    tags: ["biotech", "neurotech", "gene editing", "synthetic biology"],
    bestFor: "Biotech founders, neuroscience researchers, life science entrepreneurs",
  },
  {
    id: "floor-9",
    number: "9",
    name: "AI & Autonomous Systems",
    icon: "🦙",
    type: "thematic",
    description: "Multi-agent models to transformer architectures. Build, experiment, and redefine intelligence.",
    tags: ["AI", "agents", "transformers", "autonomous systems"],
    bestFor: "Technical builders, AI researchers, applied AI founders",
  },
  {
    id: "floor-10",
    number: "10",
    name: "Frontier @ Accelerate",
    icon: "🚀",
    type: "thematic",
    description: "Collaborate with top talent, build relationships with investors, and kickstart projects.",
    tags: ["accelerator", "startups", "fundraising", "mentorship"],
    bestFor: "Accelerator cohort, early-stage founders, mentorship seekers",
  },
  {
    id: "floor-11",
    number: "11",
    name: "Health & Longevity",
    icon: "♾️",
    type: "thematic",
    description: "Aging research, longevity biotech, and optimized health habits with cutting-edge biomarker tracking.",
    tags: ["longevity", "healthspan", "biomarkers", "aging research"],
    bestFor: "Longevity researchers, health optimization founders",
  },
  {
    id: "floor-12",
    number: "12",
    name: "Ethereum & Decentralized Tech",
    icon: "🔮",
    type: "thematic",
    description: "Shape the future of finance with blockchain, DeFi, Layer 2 solutions, and Real World Assets.",
    tags: ["ethereum", "DeFi", "web3", "RWA"],
    bestFor: "Crypto founders, protocol developers, web3 builders",
  },
  {
    id: "floor-14",
    number: "14",
    name: "Human Flourishing",
    icon: "🌷",
    type: "thematic",
    description: "Exploring alignment of flourishing, sense-making, and coordination powered by frontier tech.",
    tags: ["flourishing", "sense-making", "coordination", "alignment"],
    bestFor: "Systems thinkers, meaning-makers, coordination builders",
  },
  {
    id: "floor-15",
    number: "15",
    name: "Co-working for All Members",
    icon: "📚",
    type: "commons",
    description: "Deep work sessions with noise-cancelling environment. Perfect for focused execution.",
    tags: ["coworking", "deep work", "quiet zone", "focus"],
    bestFor: "Focused work, reading, quiet collaboration",
  },
  {
    id: "floor-16",
    number: "16",
    name: "d/acc Cross-Pollination Lounge",
    icon: "🏝️",
    type: "commons",
    description: "Cross-pollination space for all communities to mingle. Host friends, investors, or enjoy panoramic city views.",
    tags: ["salon", "cross-disciplinary", "networking", "views"],
    bestFor: "Casual intros, salon conversations, cross-floor collisions",
  },
]

export function getFloorById(id: string): FloorDefinition | undefined {
  return floors.find(floor => floor.id === id)
}

export function getFloorTypeColor(type: FloorType): string {
  switch (type) {
    case "thematic":
      return "bg-floor-thematic"
    case "commons":
      return "bg-floor-commons"
    case "private":
      return "bg-floor-private"
  }
}
