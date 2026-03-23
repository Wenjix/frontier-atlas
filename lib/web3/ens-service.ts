import { createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"
import { checksumAddress } from "./address"

export interface EnsProfile {
  name: string | null
  avatar: string | null
  description: string | null
  url: string | null
  github: string | null
  twitter: string | null
}

function sanitizeAvatarUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "https:" || parsed.protocol === "ipfs:") {
      return url
    }
    return null
  } catch {
    return null
  }
}

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL),
})

export async function resolveEnsAddress(name: string): Promise<string | null> {
  const address = await client.getEnsAddress({ name })
  return address ? checksumAddress(address) : null
}

export async function resolveEnsProfile(address: string): Promise<EnsProfile> {
  const checksummed = checksumAddress(address)
  const name = await client.getEnsName({ address: checksummed as `0x${string}` })

  if (!name) {
    return { name: null, avatar: null, description: null, url: null, github: null, twitter: null }
  }

  const [avatar, description, url, github, twitter] = await Promise.allSettled([
    client.getEnsText({ name, key: "avatar" }),
    client.getEnsText({ name, key: "description" }),
    client.getEnsText({ name, key: "url" }),
    client.getEnsText({ name, key: "com.github" }),
    client.getEnsText({ name, key: "com.twitter" }),
  ])

  return {
    name,
    avatar: sanitizeAvatarUrl(avatar.status === "fulfilled" ? avatar.value ?? null : null),
    description: description.status === "fulfilled" ? description.value ?? null : null,
    url: url.status === "fulfilled" ? url.value ?? null : null,
    github: github.status === "fulfilled" ? github.value ?? null : null,
    twitter: twitter.status === "fulfilled" ? twitter.value ?? null : null,
  }
}
