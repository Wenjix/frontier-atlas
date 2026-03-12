"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { parseStartParam } from "@/lib/telegram/start-param"
import { TelegramSignInFlow } from "@/components/telegram/telegram-sign-in-flow"
import { Spinner } from "@/components/ui/spinner"

export default function TelegramEntryPage() {
  const router = useRouter()
  const { isLoading, isLinked, memberId, startParam, error } = useTelegram()

  useEffect(() => {
    if (isLoading) return

    // If linked and has member, route to destination
    if (isLinked && memberId && startParam) {
      const route = parseStartParam(startParam)
      if (route) {
        router.replace(route)
        return
      }
    }

    // If linked, has member, no start param → go to onboarding if profile not complete, else floor
    // For now, just stay on this page — sign-in flow handles routing
  }, [isLoading, isLinked, memberId, startParam, router])

  if (isLoading) {
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

  // If already linked with member, redirect based on start_param or show floor
  if (isLinked && memberId) {
    if (startParam) {
      const route = parseStartParam(startParam)
      if (route) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Spinner className="h-8 w-8" />
          </div>
        )
      }
    }
    // Default: go to onboarding (or floor if already onboarded)
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">You&apos;re all set up in Atlas.</p>
        </div>
      </div>
    )
  }

  // Not linked — show sign-in flow
  return <TelegramSignInFlow />
}
