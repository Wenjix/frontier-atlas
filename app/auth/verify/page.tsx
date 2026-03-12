"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="size-8 text-primary" />
        </div>

        <div>
          <h1 className="font-serif text-2xl text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            We sent you a magic link. Click the link in your email to sign in.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder or try again.
          </p>
          <Link href="/auth/signin">
            <Button variant="outline" size="sm">
              Try again
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
