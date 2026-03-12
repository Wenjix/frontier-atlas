"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { FloorPeoplePage } from "@/components/floor-people-page"
import { api } from "@/lib/api-client"
import type { FloorPeopleData } from "@/lib/member-data"

export default function FloorPeopleRoute() {
  const params = useParams()
  const router = useRouter()
  const floorId = params.floorId as string

  const [data, setData] = useState<FloorPeopleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<FloorPeopleData>(`/api/floors/${floorId}/people`)
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load")
      })
      .finally(() => setLoading(false))
  }, [floorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-xl font-medium text-foreground mb-2">
            {error || "Floor not found"}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Could not load people for this floor.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-primary hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  return (
    <FloorPeoplePage
      data={data}
      floorId={floorId}
      onBack={() => router.push(`/?floor=${floorId}`)}
    />
  )
}
