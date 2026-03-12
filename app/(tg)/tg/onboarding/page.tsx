"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { TelegramOnboardingFlow } from "@/components/telegram/telegram-onboarding-flow"
import { TelegramSignInFlow } from "@/components/telegram/telegram-sign-in-flow"
import { Spinner } from "@/components/ui/spinner"

function OnboardingContent() {
  const searchParams = useSearchParams()
  const floorId = searchParams.get("floor")
  const { isLoading, isLinked, memberId } = useTelegram()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isLinked || !memberId) {
    return <TelegramSignInFlow />
  }

  return <TelegramOnboardingFlow floorId={floorId} />
}

export default function TelegramOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
