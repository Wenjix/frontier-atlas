import { z } from "zod"

export const updateFloorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nickname: z.string().max(100).nullable().optional(),
  icon: z.string().max(10).optional(),
  shortDescription: z.string().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  bestFor: z.string().max(500).nullable().optional(),
  character: z.string().max(500).nullable().optional(),
  floorType: z.enum(["THEMATIC", "COMMONS", "PRIVATE"]).optional(),
  isActive: z.boolean().optional(),
})

export const assignRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["LEAD", "HOST", "STEWARD"]),
})

export const createInvitationsSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
  floorId: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export const searchMembersSchema = z.object({
  query: z.string().min(1).max(100),
})

export const sendOnboardingEmailSchema = z.object({
  subject: z.string().max(200).optional(),
  dryRun: z.boolean().optional().default(false),
})
