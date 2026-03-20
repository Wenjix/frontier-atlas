"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

interface AdminFloor {
  id: string
  name: string
  nickname?: string
  icon?: string
  floorType: string
  isActive: boolean
  memberCount: number
  leadCount: number
  pendingInvitationCount: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [floors, setFloors] = useState<AdminFloor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<AdminFloor[]>("/api/admin/floors")
      .then(setFloors)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load dashboard: {error}
      </div>
    )
  }

  const totalMembers = floors.reduce((sum, f) => sum + f.memberCount, 0)
  const totalLeads = floors.reduce((sum, f) => sum + f.leadCount, 0)
  const totalPendingInvites = floors.reduce(
    (sum, f) => sum + f.pendingInvitationCount,
    0
  )

  const stats = [
    { label: "Total Floors", value: floors.length },
    { label: "Total Members", value: totalMembers },
    { label: "Total Leads", value: totalLeads },
    { label: "Pending Invitations", value: totalPendingInvites },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Floor grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Floors</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {floors.map((floor) => (
            <Card
              key={floor.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/admin/floors/${floor.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {floor.icon ? `${floor.icon} ` : ""}
                    {floor.name}
                  </CardTitle>
                  <Badge variant="secondary">{floor.floorType}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{floor.memberCount} members</span>
                  <span>{floor.leadCount} leads</span>
                </div>
                {!floor.isActive && (
                  <Badge variant="outline" className="mt-2">
                    Inactive
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
