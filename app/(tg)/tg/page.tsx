"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { parseStartParam } from "@/lib/telegram/start-param"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { TelegramQuickOnboarding } from "@/components/telegram/telegram-quick-onboarding"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

// Extract floor ID from a startParam like "onboarding_floor9" → "floor-9"
function extractFloorFromStartParam(startParam: string | null): string | null {
  if (!startParam) return null
  const match = startParam.match(/floor(.+?)(?:_|$)/)
  return match ? `floor-${match[1]}` : null
}

// Default floor when none specified via deep link
const DEFAULT_FLOOR_ID = "floor-1"

export default function TelegramEntryPage() {
  const router = useRouter()
  const { isLoading, memberId, startParam, profileStatus, error, user, updateUser } = useTelegram()
  const [autoCreating, setAutoCreating] = useState(false)
  const [autoCreateError, setAutoCreateError] = useState<string | null>(null)
  const [assignedFloorId, setAssignedFloorId] = useState<string | null>(null)
  const autoCreateAttempted = useRef(false)

  const floorId = extractFloorFromStartParam(startParam) ?? DEFAULT_FLOOR_ID

  // Auto-create member if TG user has no member record
  useEffect(() => {
    if (isLoading) return
    if (memberId) return // Already has member
    if (!user) return // No TG user yet
    if (autoCreateAttempted.current) return // Already tried

    autoCreateAttempted.current = true
    setAutoCreating(true)
    setAutoCreateError(null)
    telegramApi
      .post<{ userId: string; memberId: string; floorId: string; alreadyExisted?: boolean }>(
        "/api/telegram/auto-create-member",
        { floorId }
      )
      .then((result) => {
        setAssignedFloorId(result.floorId)
        updateUser({ userId: result.userId, memberId: result.memberId, profileStatus: "DRAFT" })
      })
      .catch((err) => {
        setAutoCreateError(err instanceof Error ? err.message : "Failed to set up your account")
      })
      .finally(() => {
        setAutoCreating(false)
      })
  }, [isLoading, memberId, user, floorId, updateUser])

  // Route published users to their destination
  useEffect(() => {
    if (isLoading || autoCreating) return
    if (!memberId || profileStatus !== "PUBLISHED") return

    if (startParam) {
      const route = parseStartParam(startParam)
      if (route) {
        router.replace(route)
        return
      }
    }
  }, [isLoading, autoCreating, memberId, profileStatus, startParam, router])

  if (isLoading || autoCreating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Unable to connect</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  // Auto-create failed — show error with retry
  if (autoCreateError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{autoCreateError}</p>
          <Button
            onClick={() => {
              autoCreateAttempted.current = false
              setAutoCreateError(null)
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  // Published profile — show welcome with navigation
  if (memberId && profileStatus === "PUBLISHED") {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-serif">Welcome back</h1>
          <p className="text-muted-foreground">You&apos;re all set up in Atlas.</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => router.push(`/tg/floors/${floorId}/people`)}>
              Explore your floor
            </Button>
            <Button onClick={() => router.push("/tg/onboarding/full")} variant="outline" size="sm">
              Edit my profile
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Draft profile or just created — show quick onboarding
  if (memberId) {
    return <TelegramQuickOnboarding floorId={assignedFloorId ?? floorId} />
  }

  // Fallback: no member and no error — shouldn't happen, show loading
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
