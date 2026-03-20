"use client"

import { cn } from "@/lib/utils"
import type { FloorDefinition, FloorType } from "@/lib/floor-data"
import { Search, BookOpen, Home } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface TowerSpineProps {
  floors: FloorDefinition[]
  selectedFloor: string | null
  onSelectFloor: (floorId: string) => void
  onHome: () => void
  filter: "all" | FloorType
  onFilterChange: (filter: "all" | FloorType) => void
  floorMemberCounts?: Record<string, number>
}

function FloorBadge({ number, isSelected }: { number: string; isSelected: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center size-7 rounded-md text-xs font-mono font-medium shrink-0 transition-colors",
      isSelected 
        ? "bg-sidebar-primary text-sidebar-primary-foreground" 
        : "bg-sidebar-accent/60 text-sidebar-foreground/70"
    )}>
      {number}
    </span>
  )
}

function FloorSlice({
  floor,
  isSelected,
  onClick,
  memberCount
}: {
  floor: FloorDefinition
  isSelected: boolean
  onClick: () => void
  memberCount?: number
}) {
  const accentColors = {
    thematic: "bg-floor-thematic",
    commons: "bg-floor-commons",
    private: "bg-floor-private",
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3.5 transition-all duration-200 relative group",
        "hover:bg-sidebar-accent/40 focus-visible:bg-sidebar-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset",
        isSelected 
          ? "py-3 bg-sidebar-accent/50" 
          : "py-2.5"
      )}
    >
      {/* Accent bar on selected */}
      {isSelected && (
        <span className={cn(
          "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full",
          accentColors[floor.type]
        )} />
      )}
      
      <div className="flex items-center gap-3">
        <FloorBadge number={floor.number} isSelected={isSelected} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-sm truncate transition-colors",
              isSelected
                ? "text-sidebar-foreground font-medium"
                : "text-sidebar-foreground/85"
            )}>
              {floor.name}
              {memberCount != null && memberCount > 0 && (
                <span className="text-xs text-sidebar-foreground/50"> ({memberCount})</span>
              )}
            </h3>
          </div>
        </div>
      </div>
    </button>
  )
}

export function TowerSpine({
  floors,
  selectedFloor,
  onSelectFloor,
  onHome,
  filter,
  onFilterChange,
  floorMemberCounts
}: TowerSpineProps) {
  const [searchQuery, setSearchQuery] = useState("")
  
  const filteredFloors = floors
    .filter(floor => filter === "all" || floor.type === filter)
    .filter(floor => 
      searchQuery === "" || 
      floor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      floor.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .reverse()

  const filterButtons: { label: string; value: "all" | FloorType }[] = [
    { label: "All", value: "all" },
    { label: "Thematic", value: "thematic" },
    { label: "Commons", value: "commons" },
    { label: "Private", value: "private" },
  ]

  return (
    <aside className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Home button */}
      <button
        onClick={onHome}
        className={cn(
          "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-sidebar-border/30",
          "hover:bg-sidebar-accent/40",
          !selectedFloor
            ? "bg-sidebar-accent/50 text-sidebar-foreground"
            : "text-sidebar-foreground/70"
        )}
      >
        <Home className="size-4 text-sidebar-primary" />
        <span className="text-sm font-medium">Home</span>
      </button>

      {/* Header with search */}
      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sidebar-foreground/40" />
          <Input
            type="text"
            placeholder="Search floors..."
            aria-label="Search floors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-sidebar-accent/40 border-sidebar-border/40 text-sidebar-foreground placeholder:text-sidebar-foreground/35 text-sm rounded-lg"
          />
        </div>
      </div>

      {/* Soft segmented filter */}
      <div className="px-4 py-3">
        <div className="flex p-1 bg-sidebar-accent/30 rounded-lg">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => onFilterChange(btn.value)}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs rounded-md transition-all",
                filter === btn.value
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground/80"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floor List */}
      <div className="flex-1 overflow-y-auto border-t border-sidebar-border/40">
        {filteredFloors.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-sidebar-foreground/60 mb-2">No floors match your search</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-xs text-sidebar-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="py-1">
            {filteredFloors.map((floor) => (
              <FloorSlice
                key={floor.id}
                floor={floor}
                isSelected={selectedFloor === floor.id}
                onClick={() => onSelectFloor(floor.id)}
                memberCount={floorMemberCounts?.[floor.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border/40 space-y-1.5">
        <p className="text-xs text-sidebar-foreground/50">
          {floors.length} floors · Navigate the building
        </p>
        <a
          href="https://ft0.sh/wiki"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors flex items-center gap-1.5"
        >
          <BookOpen className="size-3" />
          Community Wiki
        </a>
      </div>
    </aside>
  )
}
