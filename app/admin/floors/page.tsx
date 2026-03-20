"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

interface AdminFloor {
  id: string
  name: string
  nickname?: string
  floorType: string
  isActive: boolean
  memberCount: number
  leadCount: number
  pendingInvitationCount: number
}

export default function AdminFloorsPage() {
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
        Failed to load floors: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Floors</h1>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Members</th>
              <th className="px-4 py-3 text-right font-medium">Leads</th>
              <th className="px-4 py-3 text-right font-medium">
                Pending Invites
              </th>
            </tr>
          </thead>
          <tbody>
            {floors.map((floor, idx) => (
              <tr
                key={floor.id}
                className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/floors/${floor.id}`)}
              >
                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">
                  {floor.name}
                  {!floor.isActive && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{floor.floorType}</Badge>
                </td>
                <td className="px-4 py-3 text-right">{floor.memberCount}</td>
                <td className="px-4 py-3 text-right">{floor.leadCount}</td>
                <td className="px-4 py-3 text-right">
                  {floor.pendingInvitationCount}
                </td>
              </tr>
            ))}
            {floors.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No floors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
