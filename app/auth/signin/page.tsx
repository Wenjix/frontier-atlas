"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletConnectButton } from "@/components/wallet-connect-button"

const isDev = process.env.NODE_ENV === "development"

function SignInForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isDev) {
        // Dev: Credentials provider — signs in immediately, no email sent
        await signIn("dev-login", { email, callbackUrl })
      } else {
        // Prod: Nodemailer — sends a magic link email
        await signIn("nodemailer", { email, callbackUrl })
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl text-foreground">
          Sign in to Frontier Atlas
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isDev
            ? "Dev mode — enter any email to sign in instantly."
            : "Enter your email and we'll send you a magic link."}
        </p>
      </div>

      <WalletConnectButton />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder={isDev ? "maya@example.com" : "you@example.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !email}>
          {loading ? "Signing in..." : isDev ? "Sign in (dev)" : "Send magic link"}
        </Button>
      </form>

      {!isDev && (
        <p className="text-xs text-center text-muted-foreground">
          You'll receive an email with a link to sign in. No password needed.
        </p>
      )}
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={
        <div className="text-sm text-muted-foreground">Loading...</div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  )
}
