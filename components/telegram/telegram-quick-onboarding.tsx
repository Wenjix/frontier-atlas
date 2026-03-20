"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { visibilityMap, opennessMap } from "@/lib/enum-maps"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { Check } from "lucide-react"

const SUGGESTED_TOPICS = [
  "AI", "Robotics", "Biotech", "Health", "Longevity", "Arts", "Music",
  "Makers", "Crypto", "Design", "Community", "Fundraising", "Hardware",
  "Events", "Human Flourishing",
]

interface OnboardingStats {
  memberCount: number
  recentJoinCount: number
  recentMembers: { fullName: string; avatarUrl: string | null }[]
}

interface TelegramQuickOnboardingProps {
  floorId: string
}

export function TelegramQuickOnboarding({ floorId }: TelegramQuickOnboardingProps) {
  const router = useRouter()
  const { user, webApp } = useTelegram()
  const [fullName, setFullName] = useState("")
  const [oneLineIntro, setOneLineIntro] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [stats, setStats] = useState<OnboardingStats | null>(null)

  // Pre-fill name from Telegram identity
  useEffect(() => {
    if (webApp?.initDataUnsafe?.user) {
      const tgUser = webApp.initDataUnsafe.user
      const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")
      if (name) setFullName(name)
    }
  }, [webApp])

  const toggleTopic = (topic: string) => {
    setTopics((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic)
      if (prev.length >= 5) return prev
      return [...prev, topic]
    })
  }

  const canPublish = fullName.trim().length > 0 && oneLineIntro.trim().length > 0 && topics.length > 0

  const handlePublish = async () => {
    if (!canPublish) return
    setPublishing(true)
    try {
      // Save draft first
      await telegramApi.put("/api/me/profile/draft", {
        fullName: fullName.trim(),
        oneLineIntro: oneLineIntro.trim(),
        visibility: visibilityMap.floor,
        introOpenness: opennessMap.very,
        topics,
      })

      // Publish with quick mode
      await telegramApi.post("/api/me/profile/publish", { mode: "quick" })

      // Fetch social proof for completion screen
      try {
        const statsRes = await telegramApi.get<OnboardingStats>(
          `/api/floors/${floorId}/onboarding-stats`
        )
        setStats(statsRes)
      } catch {
        // Non-critical
      }

      setPublished(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish profile")
    } finally {
      setPublishing(false)
    }
  }

  if (published) {
    const floorName = floorId.replace("floor-", "Floor ")
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-serif">You&apos;re live!</h1>
            <p className="text-muted-foreground">
              {stats
                ? `${stats.memberCount} ${stats.memberCount === 1 ? "neighbor" : "neighbors"} on ${floorName}.`
                : `Welcome to ${floorName}.`}
            </p>
          </div>

          {stats && stats.recentMembers.length > 0 && (
            <div className="flex justify-center -space-x-2">
              {stats.recentMembers.slice(0, 5).map((m, i) => (
                <Avatar key={i} className="h-10 w-10 border-2 border-background">
                  <AvatarImage src={m.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}

          {stats && stats.recentJoinCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {stats.recentJoinCount} {stats.recentJoinCount === 1 ? "person" : "people"} joined this week
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => router.push(`/tg/floors/${floorId}/people`)}>
              Explore your floor
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/tg/onboarding/full")}
            >
              Deepen your profile
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-serif">Set up your profile</h1>
          <p className="text-sm text-muted-foreground">
            30 seconds. That&apos;s all it takes.
          </p>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={webApp?.initDataUnsafe?.user?.photo_url ?? undefined} />
            <AvatarFallback className="text-lg">
              {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>

        {/* One-line intro */}
        <div className="space-y-1">
          <Label htmlFor="intro">One-line intro</Label>
          <Input
            id="intro"
            value={oneLineIntro}
            onChange={(e) => setOneLineIntro(e.target.value)}
            placeholder="e.g. Building AI tools for urban farming"
            maxLength={200}
          />
        </div>

        {/* Topics */}
        <div className="space-y-2">
          <Label>What are you into? <span className="text-muted-foreground font-normal">(pick 1-5)</span></Label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((topic) => {
              const selected = topics.includes(topic)
              return (
                <Badge
                  key={topic}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => toggleTopic(topic)}
                >
                  {topic}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Publish */}
        <Button
          className="w-full"
          size="lg"
          disabled={!canPublish || publishing}
          onClick={handlePublish}
        >
          {publishing ? <Spinner className="h-4 w-4 mr-2" /> : null}
          {publishing ? "Going live..." : "Go Live"}
        </Button>
      </div>
    </div>
  )
}
