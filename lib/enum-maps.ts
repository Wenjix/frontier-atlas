export const visibilityMap = {
  floor: "FLOOR",
  tower: "TOWER",
  leads: "LEADS_ONLY",
} as const

export const visibilityReverseMap = {
  FLOOR: "floor",
  TOWER: "tower",
  LEADS_ONLY: "leads",
} as const

export const opennessMap = {
  very: "VERY_OPEN",
  relevant: "OPEN_IF_RELEVANT",
  low: "LOW_PROFILE",
} as const

export const opennessReverseMap = {
  VERY_OPEN: "very",
  OPEN_IF_RELEVANT: "relevant",
  LOW_PROFILE: "low",
} as const

export const introReasonMap = {
  "shared-interest": "SHARED_INTEREST",
  "event-follow-up": "EVENT_FOLLOW_UP",
  feedback: "FEEDBACK",
  collaboration: "COLLABORATION",
  learning: "LEARNING",
  other: "OTHER",
} as const

export const connectionMap = {
  async: "QUICK_ASYNC_INTRO",
  "chat-15": "FIFTEEN_MIN_CHAT",
  event: "MEET_AT_EVENT",
  open: "OPEN_TO_WHATEVER",
} as const

export const connectionReverseMap = {
  QUICK_ASYNC_INTRO: "async",
  FIFTEEN_MIN_CHAT: "chat-15",
  MEET_AT_EVENT: "event",
  OPEN_TO_WHATEVER: "open",
} as const

export const introStatusMap = {
  "not-now": "NOT_NOW",
  "alternate-path": "ALTERNATE_PATH",
  accepted: "ACCEPTED",
  passed: "PASSED",
  cancelled: "CANCELLED",
  pending: "PENDING",
} as const

export const introStatusReverseMap = {
  NOT_NOW: "not-now",
  ALTERNATE_PATH: "alternate-path",
  ACCEPTED: "accepted",
  PASSED: "passed",
  CANCELLED: "cancelled",
  PENDING: "pending",
} as const
