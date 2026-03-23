"use client"

import { useState } from "react"
import { useWalletProviders } from "@/hooks/use-wallet-providers"
import { Button } from "@/components/ui/button"

type WalletState = "disconnected" | "wrong-chain" | "ready" | "signing"

const ETHEREUM_CHAIN_ID = "0x1"

export function WalletConnectButton() {
  const providers = useWalletProviders()
  const [state, setState] = useState<WalletState>("disconnected")
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(null)

  async function handleConnect() {
    setError(null)
    const provider = providers[0]
    if (!provider) {
      setError("No wallet detected. Install MetaMask or another browser wallet.")
      return
    }

    try {
      const accounts = (await provider.provider.request({
        method: "eth_requestAccounts",
      })) as string[]
      if (!accounts[0]) return
      setAccount(accounts[0])

      const chainId = (await provider.provider.request({
        method: "eth_chainId",
      })) as string
      setState(chainId === ETHEREUM_CHAIN_ID ? "ready" : "wrong-chain")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet")
    }
  }

  async function handleSwitchChain() {
    setError(null)
    const provider = providers[0]
    if (!provider) return

    try {
      await provider.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ETHEREUM_CHAIN_ID }],
      })
      setState("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch chain")
    }
  }

  async function handleSignIn() {
    setError(null)
    setState("signing")
    // SIWE sign-in flow implemented in 1E-4
    setState("ready")
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
