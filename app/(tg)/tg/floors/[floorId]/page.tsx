"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { Users, Calendar } from "lucide-react"

interface FloorData {
  id: string
  number: string
  name: string
  icon: string | null
  shortDescription: string | null
  memberCount: number
  upcomingEventCount: number
}

interface FeaturedMember {
  id: string
  fullName: string
  avatarUrl: string | null
  reason: string
}

export default function TelegramFloorPage({
  params,
}: {
  params: Promise<{ floorId: string }>
}) {
  const { floorId } = use(params)
  const { webApp, isLoading: authLoading } = useTelegram()
  const [floor, setFloor] = useState<FloorData | null>(null)
  const [featured, setFeatured] = useState<FeaturedMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (webApp) {
      webApp.BackButton.show()
      const handleBack = () => window.history.back()
      webApp.BackButton.onClick(handleBack)
      return () => {
        webApp.BackButton.offClick(handleBack)
        webApp.BackButton.hide()
      }
    }
  }, [webApp])

  useEffect(() => {
    if (authLoading) return

    async function loadFloor() {
      try {
        const [floorData, peopleData] = await Promise.all([
          telegramApi.get<FloorData>(`/api/floors/${floorId}`),
          telegramApi.get<{
            floor: { id: string; name: string }
            featuredMembers?: FeaturedMember[]
          }>(`/api/floors/${floorId}/people?pageSize=1`),
        ])
        setFloor(floorData)
        if (peopleData.featuredMembers) {
          setFeatured(peopleData.featuredMembers)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load floor")
      } finally {
        setLoading(false)
      }
    }
    loadFloor()
  }, [floorId, authLoading])

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !floor) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <p className="text-muted-foreground">{error ?? "Floor not found"}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Floor Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {floor.icon && <span className="text-2xl">{floor.icon}</span>}
          <h1 className="text-2xl font-serif">Floor {floor.number}: {floor.name}</h1>
        </div>
        {floor.shortDescription && (
          <p className="text-muted-foreground">{floor.shortDescription}</p>
        )}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-4" />
            {floor.memberCount} members
          </span>
          {floor.upcomingEventCount > 0 && (
            <span className="flex items-center gap-1">
              <Calendar className="size-4" />
              {floor.upcomingEventCount} upcoming
            </span>
          )}
        </div>
      </div>

      {/* Featured Members */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Featured members</h2>
          <div className="space-y-2">
            {featured.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={member.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {member.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.reason}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <Link href={`/tg/floors/${floorId}/people`}>
        <Button className="w-full" variant="outline">
          <Users className="size-4 mr-2" />
          Browse all people
        </Button>
      </Link>
    </div>
  )
}
