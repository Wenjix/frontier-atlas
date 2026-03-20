"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { TelegramOnboardingFlow } from "@/components/telegram/telegram-onboarding-flow"
import { TelegramSignInFlow } from "@/components/telegram/telegram-sign-in-flow"
import { Spinner } from "@/components/ui/spinner"

function FullOnboardingContent() {
  const searchParams = useSearchParams()
  const floorId = searchParams.get("floor")
  const { isLoading, memberId } = useTelegram()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!memberId) {
    return <TelegramSignInFlow />
  }

  return <TelegramOnboardingFlow floorId={floorId} />
}

export default function TelegramFullOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <FullOnboardingContent />
    </Suspense>
  )
}
