"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo } from "react"
import { FloorPeoplePage } from "@/components/floor-people-page"
import { floors } from "@/lib/floor-data"
import { generateMockMembersForFloor } from "@/lib/member-data"

export default function FloorPeopleRoute() {
  const params = useParams()
  const router = useRouter()
  const floorId = params.floorId as string
  
  // Find the floor from our data
  const floor = useMemo(() => 
    floors.find(f => f.id === floorId),
    [floorId]
  )
  
  // Generate mock data for this floor
  const data = useMemo(() => {
    if (!floor) return null
    return generateMockMembersForFloor(floor.id, floor.name)
  }, [floor])
  
  // Handle not found
  if (!floor || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-xl font-medium text-foreground mb-2">Floor not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            The floor you're looking for doesn't exist.
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
      onBack={() => router.push(`/?floor=${floorId}`)}
    />
  )
}
