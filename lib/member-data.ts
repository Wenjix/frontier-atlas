// Member types for the floor people directory

export type ContextSignal = "new" | "open_to_meet" | "hosting_soon" | null

export type ProfileVisibility = "floor" | "tower" | "leads_only"
export type IntroOpenness = "very_open" | "open_if_relevant" | "low_profile"

// Compact roster item for directory list
export interface MemberListItem {
  id: string
  fullName: string
  avatarUrl?: string | null
  oneLineIntro: string
  contextSignal?: ContextSignal
}

// Full member detail for profile drawer
export interface MemberDetail {
  id: string
  fullName: string
  avatarUrl?: string | null
  oneLineIntro: string
  profileVisibility: ProfileVisibility
  introOpenness: IntroOpenness
  workingOn?: string | null
  curiousAbout?: string | null
  wantsToMeet?: string | null
  canHelpWith?: string | null
  needsHelpWith?: string | null
  conversationStarter?: string | null
  websiteUrl?: string | null
  topics?: string[]
  contextSignal?: ContextSignal
}

// Featured member for "People to Know" strip
export interface FeaturedMember {
  id: string
  fullName: string
  avatarUrl?: string | null
  reason: string
}

// Floor people page response shape
export interface FloorPeopleData {
  floor: {
    id: string
    number: string
    name: string
    shortDescription: string
  }
  featuredMembers?: FeaturedMember[]
  members: MemberListItem[]
  totalCount: number
}

// Mock data generator for a floor
export function generateMockMembersForFloor(floorId: string, floorName: string): FloorPeopleData {
  // Generate realistic mock members based on floor theme
  const floorThemes: Record<string, { description: string; members: Omit<MemberListItem, 'id'>[] }> = {
    "floor-9": {
      description: "Builders working on models, agents, tooling, and applied AI products.",
      members: [
        { fullName: "Maya Chen", avatarUrl: null, oneLineIntro: "Designing consumer AI interfaces", contextSignal: "hosting_soon" },
        { fullName: "Alex Rivera", avatarUrl: null, oneLineIntro: "Building ML infrastructure for startups", contextSignal: "open_to_meet" },
        { fullName: "Jordan Blake", avatarUrl: null, oneLineIntro: "Working on autonomous coding agents", contextSignal: null },
        { fullName: "Nina Park", avatarUrl: null, oneLineIntro: "Researching multimodal AI systems", contextSignal: "new" },
        { fullName: "Daniel Wu", avatarUrl: null, oneLineIntro: "Fine-tuning LLMs for enterprise", contextSignal: "open_to_meet" },
        { fullName: "Priya Sharma", avatarUrl: null, oneLineIntro: "Building AI-powered design tools", contextSignal: null },
        { fullName: "Marcus Johnson", avatarUrl: null, oneLineIntro: "Training specialized language models", contextSignal: null },
        { fullName: "Leah Thompson", avatarUrl: null, oneLineIntro: "Developing AI safety frameworks", contextSignal: "new" },
        { fullName: "Chris Lee", avatarUrl: null, oneLineIntro: "Creating AI-assisted writing tools", contextSignal: null },
        { fullName: "Sophia Martinez", avatarUrl: null, oneLineIntro: "Building retrieval-augmented systems", contextSignal: "open_to_meet" },
        { fullName: "David Kim", avatarUrl: null, oneLineIntro: "Working on conversational AI", contextSignal: null },
        { fullName: "Emma Wilson", avatarUrl: null, oneLineIntro: "Researching emergent capabilities in LLMs", contextSignal: null },
      ]
    },
    "floor-5": {
      description: "Hardware hackers, robot builders, and embedded systems tinkerers.",
      members: [
        { fullName: "Sam Turner", avatarUrl: null, oneLineIntro: "Building autonomous drones", contextSignal: "hosting_soon" },
        { fullName: "Rachel Green", avatarUrl: null, oneLineIntro: "Designing robotic prosthetics", contextSignal: "open_to_meet" },
        { fullName: "Tom Anderson", avatarUrl: null, oneLineIntro: "Working on warehouse automation", contextSignal: null },
        { fullName: "Lisa Wang", avatarUrl: null, oneLineIntro: "Building computer vision systems", contextSignal: "new" },
        { fullName: "Kevin Brown", avatarUrl: null, oneLineIntro: "Designing custom PCBs for IoT", contextSignal: null },
        { fullName: "Amy Chen", avatarUrl: null, oneLineIntro: "Developing soft robotics actuators", contextSignal: "open_to_meet" },
        { fullName: "Brian Davis", avatarUrl: null, oneLineIntro: "Building autonomous vehicles", contextSignal: null },
        { fullName: "Michelle Lee", avatarUrl: null, oneLineIntro: "Working on robot manipulation", contextSignal: null },
      ]
    },
  }

  // Default fallback for any floor
  const defaultData = {
    description: "A diverse community of builders, creators, and innovators.",
    members: [
      { fullName: "Alex Morgan", avatarUrl: null, oneLineIntro: "Building something new", contextSignal: "new" as ContextSignal },
      { fullName: "Jamie Foster", avatarUrl: null, oneLineIntro: "Exploring new ideas", contextSignal: "open_to_meet" as ContextSignal },
      { fullName: "Taylor Brooks", avatarUrl: null, oneLineIntro: "Creating and connecting", contextSignal: null },
      { fullName: "Jordan Casey", avatarUrl: null, oneLineIntro: "Working on exciting projects", contextSignal: null },
      { fullName: "Riley Quinn", avatarUrl: null, oneLineIntro: "Passionate about innovation", contextSignal: null },
    ]
  }

  const floorData = floorThemes[floorId] || defaultData
  
  const members: MemberListItem[] = floorData.members.map((m, i) => ({
    id: `member-${floorId}-${i}`,
    ...m
  }))

  // Generate featured members from those with signals
  const featuredMembers: FeaturedMember[] = members
    .filter(m => m.contextSignal)
    .slice(0, 3)
    .map(m => ({
      id: m.id,
      fullName: m.fullName,
      avatarUrl: m.avatarUrl,
      reason: m.contextSignal === "hosting_soon" 
        ? "hosting demo feedback" 
        : m.contextSignal === "open_to_meet"
        ? "open to meet"
        : "new to the floor"
    }))

  return {
    floor: {
      id: floorId,
      number: floorId.replace("floor-", ""),
      name: floorName,
      shortDescription: floorData.description
    },
    featuredMembers: featuredMembers.length > 0 ? featuredMembers : undefined,
    members,
    totalCount: members.length
  }
}

// Generate mock member detail
export function generateMockMemberDetail(memberId: string): MemberDetail {
  // Extract member index and floor from ID
  const parts = memberId.split("-")
  const index = parseInt(parts[parts.length - 1]) || 0
  
  const introOpenness: IntroOpenness[] = ["very_open", "open_if_relevant", "low_profile"]
  const signals: ContextSignal[] = [null, "new", "open_to_meet", "hosting_soon"]
  
  return {
    id: memberId,
    fullName: "Maya Chen", // In real app, would look up from DB
    avatarUrl: null,
    oneLineIntro: "Designing consumer AI interfaces",
    profileVisibility: "tower",
    introOpenness: introOpenness[index % 3],
    workingOn: "Building a new AI-powered design tool that helps teams iterate faster on UI prototypes using natural language.",
    curiousAbout: "How other founders are thinking about AI-human collaboration in creative workflows.",
    wantsToMeet: "Designers who've shipped AI-native products, and founders building developer tools.",
    canHelpWith: "Product design, AI UX patterns, early-stage startup advice, design system architecture.",
    needsHelpWith: "Finding early adopters, pricing strategy for B2B SaaS, technical co-founder advice.",
    conversationStarter: "I'm hosting a demo feedback session next week - would love your thoughts on the prototype!",
    websiteUrl: "https://mayachen.design",
    contextSignal: signals[index % 4]
  }
}
