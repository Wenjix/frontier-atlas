"use client"

import { useState } from "react"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"

export function TelegramWriteAccessPrompt() {
  const { webApp } = useTelegram()
  const [dismissed, setDismissed] = useState(false)
  const [requesting, setRequesting] = useState(false)

  if (dismissed || !webApp) return null

  const handleRequest = () => {
    setRequesting(true)
    webApp.requestWriteAccess((granted) => {
      setRequesting(false)
      // Report result to backend
      telegramApi
        .post("/api/telegram/write-access", { granted })
        .catch(() => {})

      setDismissed(true)
    })
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Get Atlas updates in Telegram?</h3>
            <p className="text-sm text-muted-foreground">
              Allow Atlas to send you messages about intro requests and floor activity.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-3 mt-4">
          <Button size="sm" onClick={handleRequest} disabled={requesting}>
            {requesting ? "Requesting..." : "Allow messages"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
