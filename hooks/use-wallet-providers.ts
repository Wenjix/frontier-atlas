"use client"

import { useState, useEffect } from "react"
import type { EIP1193Provider, EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "@/lib/web3/eip6963"

export function useWalletProviders() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([])
  const [fallbackProvider, setFallbackProvider] = useState<EIP1193Provider | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as EIP6963AnnounceProviderEvent
      setProviders(prev => {
        if (prev.some(p => p.info.uuid === e.detail.info.uuid)) return prev
        return [...prev, e.detail]
      })
    }

    window.addEventListener("eip6963:announceProvider", handler)
    window.dispatchEvent(new Event("eip6963:requestProvider"))

    return () => window.removeEventListener("eip6963:announceProvider", handler)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (providers.length === 0 && typeof window !== "undefined" && window.ethereum) {
        setFallbackProvider(window.ethereum as EIP1193Provider)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [providers.length])

  return { providers, fallbackProvider }
}
