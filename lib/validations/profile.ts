import { z } from "zod"

export const profileDraftSchema = z.object({
  fullName: z.string().max(100).optional(),
  oneLineIntro: z.string().max(200).optional(),
  workingOn: z.string().max(1000).optional(),
  curiousAbout: z.string().max(1000).optional(),
  wantsToMeet: z.string().max(1000).optional(),
  canHelpWith: z.string().max(1000).optional(),
  needsHelpWith: z.string().max(1000).optional(),
  conversationStarter: z.string().max(500).nullable().optional(),
  websiteUrl: z.string().url().max(500).or(z.literal("")).nullable().optional(),
  visibility: z.enum(["FLOOR", "TOWER", "LEADS_ONLY"]).optional(),
  introOpenness: z.enum(["VERY_OPEN", "OPEN_IF_RELEVANT", "LOW_PROFILE"]).optional(),
  topics: z.array(z.string().max(50)).max(5).optional(),
})

export const profilePublishRequirements = z.object({
  oneLineIntro: z.string().min(1),
  workingOn: z.string().min(1),
  curiousAbout: z.string().min(1),
  wantsToMeet: z.string().min(1),
  canHelpWith: z.string().min(1),
  needsHelpWith: z.string().min(1),
  visibility: z.enum(["FLOOR", "TOWER", "LEADS_ONLY"]),
  introOpenness: z.enum(["VERY_OPEN", "OPEN_IF_RELEVANT", "LOW_PROFILE"]),
})
