"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react"

interface SelfVerifyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorId: string
  floorNumber: string
  floorName: string
  onVerified: () => void
}

type VerifyState = "idle" | "verifying" | "success" | "error"

const isMockMode = process.env.NEXT_PUBLIC_SELF_MOCK !== "false"

export function SelfVerifyModal({
  open,
  onOpenChange,
  floorId,
  floorNumber,
  floorName,
  onVerified,
}: SelfVerifyModalProps) {
  const [state, setState] = useState<VerifyState>("idle")
  const [error, setError] = useState<string | null>(null)

  const handleVerification = useCallback(async () => {
    setState("verifying")
    setError(null)

    try {
      const res = await fetch(`/api/floors/${floorId}/verify-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mock: isMockMode }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Verification failed")
      }

      setState("success")
      setTimeout(() => {
        onVerified()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.")
      setState("error")
    }
  }, [floorId, onVerified])

  // Polling for verification status (for real QR code flow)
  useEffect(() => {
    if (state !== "idle" || !open || isMockMode) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/floors/${floorId}`)
        const data = await res.json()
        if (data.data?.userHasMembership) {
          setState("success")
          clearInterval(interval)
          setTimeout(() => {
            onVerified()
            onOpenChange(false)
          }, 2000)
        }
      } catch { /* ignore polling errors */ }
    }, 2000)

    return () => clearInterval(interval)
  }, [state, open, floorId, onVerified, onOpenChange])

  function handleRetry() {
    setError(null)
    setState("idle")
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setState("idle")
      setError(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Verify to join Floor {floorNumber}: {floorName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {state === "idle" && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                {isMockMode
                  ? "Click below to simulate Self Protocol verification."
                  : "Scan the QR code with the Self app to verify your identity and gain access to this floor."}
              </p>

              {!isMockMode && (
                <div
                  className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center"
                  data-floor-id={floorId}
                >
                  <span className="text-xs text-muted-foreground">
                    Self Protocol QR
                  </span>
                </div>
              )}

              {isMockMode && (
                <Button onClick={handleVerification} className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Simulate Verification
                </Button>
              )}
            </div>
          )}

          {state === "verifying" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Verifying your credential...
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium">Verification successful!</p>
              <p className="text-xs text-muted-foreground">
                You now have access to Floor {floorNumber}.
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">
                {error || "Verification failed. Please try again."}
              </p>
              <Button variant="outline" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
