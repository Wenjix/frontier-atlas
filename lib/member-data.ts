// Member types for the floor people directory

export type ContextSignal = "new" | "open_to_meet" | "hosting_soon" | null

export type ProfileVisibility = "floor" | "tower" | "leads"
export type IntroOpenness = "very" | "relevant" | "low"

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

