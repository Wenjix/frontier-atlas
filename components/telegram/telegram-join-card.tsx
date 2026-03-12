"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { X } from "lucide-react"

const TELEGRAM_INVITE_URL = process.env.NEXT_PUBLIC_TELEGRAM_COMMUNITY_INVITE_URL ?? ""

interface TelegramJoinCardProps {
  onDismiss?: () => void
}

export function TelegramJoinCard({ onDismiss }: TelegramJoinCardProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleJoin = async () => {
    try {
      await telegramApi.post("/api/telegram/community-invite/clicked")
    } catch {
      // Non-critical — don't block the user
    }
    window.open(TELEGRAM_INVITE_URL, "_blank")
  }

  const handleDismiss = async () => {
    setDismissed(true)
    onDismiss?.()
    try {
      await telegramApi.post("/api/telegram/community-invite/dismiss")
    } catch {
      // Non-critical
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Join the Frontier Telegram</h3>
            <p className="text-sm text-muted-foreground">
              Atlas helps you navigate the tower. Telegram is where a lot of the live
              conversation still happens.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-3 mt-4">
          <Button size="sm" onClick={handleJoin}>
            Join Telegram
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Maybe later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
