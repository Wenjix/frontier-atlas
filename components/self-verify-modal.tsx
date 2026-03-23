"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface SelfVerifyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorId: string
  floorNumber: string
  floorName: string
  onVerified: () => void
}

type VerifyState = "idle" | "verifying" | "success" | "error"

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

  function handleRetry() {
    setError(null)
    setState("idle")
  }

  // Verification polling implemented in 3E-3
  // QR code integration implemented in 3E-2

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
                Scan the QR code with the Self app to verify your identity and
                gain access to this floor.
              </p>
              {/* QR code placeholder — replaced in 3E-2 */}
              <div
                className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center"
                data-floor-id={floorId}
              >
                <span className="text-xs text-muted-foreground">
                  QR Code
                </span>
              </div>
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
