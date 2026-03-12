import { z } from "zod"

export const claimInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
})
