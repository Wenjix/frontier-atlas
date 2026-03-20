import { useState, useEffect } from "react"
import { api } from "@/lib/api-client"
import type { FloorDefinition, FloorType } from "@/lib/floor-data"

export type { FloorDefinition, FloorType }

export function useFloors() {
  const [floors, setFloors] = useState<FloorDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get<FloorDefinition[]>("/api/floors")
      .then(setFloors)
      .catch(() => {
        // Fallback: import static data if API fails
        import("@/lib/floor-data").then(mod => setFloors(mod.floors))
      })
      .finally(() => setIsLoading(false))
  }, [])

  return { floors, isLoading }
}
