import { z } from "zod"

export const createIntroRequestSchema = z.object({
  recipientMemberId: z.string().min(1),
  reason: z.enum(["FEEDBACK", "COLLABORATION", "LEARNING", "SHARED_INTEREST", "EVENT_FOLLOW_UP", "OTHER"]),
  note: z.string().min(50, "Note must be at least 50 characters").max(2000),
  preferredConnection: z.enum(["QUICK_ASYNC_INTRO", "FIFTEEN_MIN_CHAT", "MEET_AT_EVENT", "OPEN_TO_WHATEVER"]),
  linkUrl: z.string().url().max(500).nullable().optional(),
})

export const respondIntroRequestSchema = z.object({
  action: z.enum(["ACCEPTED", "NOT_NOW", "PASSED", "ALTERNATE_PATH"]),
  responseNote: z.string().max(1000).nullable().optional(),
  alternatePathType: z.enum(["MEET_AT_EVENT", "SEND_ASYNC_QUESTION", "FOLLOW_UP_LATER", "OTHER"]).nullable().optional(),
  alternatePathUrl: z.string().url().max(500).nullable().optional(),
})
