"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { TelegramJoinCard } from "./telegram-join-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

type FlowStep = "email" | "join-prompt" | "done"

export function TelegramSignInFlow() {
  const router = useRouter()
  const { user, refreshUser } = useTelegram()
  const [step, setStep] = useState<FlowStep>("email")
  const [email, setEmail] = useState("")
  const [invitationToken, setInvitationToken] = useState("")
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [linkResult, setLinkResult] = useState<{
    memberId: string | null
    floorId: string | null
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    try {
      const result = await telegramApi.post<{
        userId: string
        memberId: string | null
        floorId: string | null
        membershipStatus: string | null
      }>("/api/telegram/link-account", {
        email: email.trim(),
        invitationToken: invitationToken.trim() || undefined,
      })

      setLinkResult(result)
      await refreshUser()

      // Show join prompt if user hasn't seen it
      if (user?.telegramJoinStatus === "UNKNOWN") {
        setStep("join-prompt")
      } else {
        navigateAfterLink(result.memberId, result.floorId)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link account")
    } finally {
      setSubmitting(false)
    }
  }

  const navigateAfterLink = (memberId: string | null, floorId: string | null) => {
    if (memberId && floorId) {
      router.push(`/tg/onboarding?floor=${floorId}`)
    } else if (memberId) {
      router.push("/tg/onboarding")
    } else {
      // User exists but no member — they need an invitation
      setStep("done")
    }
  }

  const handleJoinDismiss = () => {
    if (linkResult) {
      navigateAfterLink(linkResult.memberId, linkResult.floorId)
    }
  }

  if (step === "join-prompt") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <TelegramJoinCard onDismiss={handleJoinDismiss} />
          <Button
            className="w-full"
            onClick={() => {
              if (linkResult) {
                navigateAfterLink(linkResult.memberId, linkResult.floorId)
              }
            }}
          >
            Continue to Atlas
          </Button>
        </div>
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <h2 className="text-xl font-semibold">Account linked</h2>
          <p className="text-sm text-muted-foreground">
            You&apos;ll need an invitation to join a floor. Ask your floor lead or check your email.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Frontier Atlas</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your email to connect your Atlas account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          {showTokenInput && (
            <div className="space-y-2">
              <Label htmlFor="token">Invitation token</Label>
              <Input
                id="token"
                placeholder="Paste your invitation token"
                value={invitationToken}
                onChange={(e) => setInvitationToken(e.target.value)}
              />
            </div>
          )}

          {!showTokenInput && (
            <button
              type="button"
              onClick={() => setShowTokenInput(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Have an invitation token?
            </button>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            {submitting ? "Connecting..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  )
}
