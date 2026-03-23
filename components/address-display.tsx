"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Copy, Check, ExternalLink } from "lucide-react"

interface AddressDisplayProps {
  address: string
  ensName?: string | null
  showCopy?: boolean
  showExplorer?: boolean
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function AddressDisplay({
  address,
  ensName,
  showCopy = true,
  showExplorer = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)

  const displayText = ensName || truncateAddress(address)
  const etherscanUrl = `https://etherscan.io/address/${address}`

  async function handleCopy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-mono text-sm">{displayText}</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono text-xs">{address}</span>
        </TooltipContent>
      </Tooltip>

      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}

      {showExplorer && (
        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
          <a href={etherscanUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </span>
  )
}
