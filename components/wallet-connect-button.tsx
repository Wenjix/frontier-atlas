"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useWalletProviders } from "@/hooks/use-wallet-providers"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type WalletState = "disconnected" | "wrong-chain" | "ready" | "signing"

const ETHEREUM_CHAIN_ID = "0x1"

function createSiweMessage(address: string, nonce: string): string {
  const domain = window.location.host
  const origin = window.location.origin
  const now = new Date()
  const expiration = new Date(now.getTime() + 5 * 60 * 1000)

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Frontier Atlas",
    "",
    `URI: ${origin}`,
    "Version: 1",
    "Chain ID: 1",
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expiration Time: ${expiration.toISOString()}`,
  ].join("\n")
}

function getWalletErrorMessage(error: unknown): string {
  const err = error as { code?: number; message?: string }
  switch (err.code) {
    case 4001:
      return "You declined the request."
    case -32002:
      return "Please check your wallet — a request is pending."
    case -32603:
      return "Wallet encountered an error. Please try again."
    default:
      return err.message ?? "Could not connect to your wallet. Please try again."
  }
}

export function WalletConnectButton() {
  const { providers, fallbackProvider } = useWalletProviders()
  const [state, setState] = useState<WalletState>("disconnected")
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(null)

  function getProvider() {
    return providers[0]?.provider ?? fallbackProvider
  }

  async function handleConnect() {
    setError(null)
    const provider = getProvider()
    if (!provider) {
      setError("No wallet detected. Install MetaMask or another browser wallet.")
      return
    }

    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[]
      if (!accounts[0]) return
      setAccount(accounts[0])

      const chainId = (await provider.request({
        method: "eth_chainId",
      })) as string
      setState(chainId === ETHEREUM_CHAIN_ID ? "ready" : "wrong-chain")
    } catch (err) {
      setError(getWalletErrorMessage(err))
    }
  }

  async function handleSwitchChain() {
    setError(null)
    const provider = getProvider()
    if (!provider) return

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ETHEREUM_CHAIN_ID }],
      })
      setState("ready")
    } catch (err) {
      setError(getWalletErrorMessage(err))
    }
  }

  async function handleSignIn() {
    setError(null)
    setState("signing")
    const provider = getProvider()
    if (!provider || !account) {
      setState("ready")
      return
    }

    try {
      // 1. Fetch nonce from server
      const nonceRes = await fetch("/api/auth/siwe/nonce")
      const { nonce } = await nonceRes.json()

      // 2. Construct SIWE message
      const message = createSiweMessage(account, nonce)

      // 3. Request signature from wallet
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, account],
      })

      // 4. Sign in via NextAuth
      const result = await signIn("siwe", {
        message,
        signature: signature as string,
        redirect: false,
      })

      if (result?.ok) {
        window.location.href = result.url ?? "/"
      } else {
        setError("Sign-in failed. Please try again.")
        setState("ready")
      }
    } catch (err) {
      setError(getWalletErrorMessage(err))
      setState("ready")
    }
  }

  return (
    <div className="space-y-2">
      {state === "disconnected" && (
        <Button onClick={handleConnect} className="w-full">
          Connect Wallet
        </Button>
      )}

      {state === "wrong-chain" && (
        <Button onClick={handleSwitchChain} variant="outline" className="w-full border-amber-500 text-amber-600">
          Switch to Ethereum
        </Button>
      )}

      {state === "ready" && (
        <Button onClick={handleSignIn} className="w-full">
          Sign in with Ethereum
        </Button>
      )}

      {state === "signing" && (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing...
        </Button>
      )}

      {account && state !== "disconnected" && (
        <p className="text-xs text-muted-foreground text-center truncate">
          {account}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
