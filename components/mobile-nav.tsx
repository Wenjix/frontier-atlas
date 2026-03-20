"use client"

import { cn } from "@/lib/utils"
import { floors, type FloorDefinition, type FloorType } from "@/lib/floor-data"
import { Building2, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"

interface MobileNavProps {
  selectedFloor: FloorDefinition | null
  onSelectFloor: (floorId: string) => void
  filter: "all" | FloorType
  onFilterChange: (filter: "all" | FloorType) => void
}

export function MobileNav({ 
  selectedFloor, 
  onSelectFloor,
  filter,
  onFilterChange
}: MobileNavProps) {
  const filteredFloors = floors
    .filter(floor => filter === "all" || floor.type === filter)
    .reverse()

  const filterButtons: { label: string; value: "all" | FloorType }[] = [
    { label: "All", value: "all" },
    { label: "Thematic", value: "thematic" },
    { label: "Commons", value: "commons" },
    { label: "Private", value: "private" },
  ]

  const typeStyles = {
    thematic: "border-l-floor-thematic",
    commons: "border-l-floor-commons",
    private: "border-l-floor-private",
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between gap-2 h-14 px-4 bg-sidebar text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-sidebar-primary" />
            {selectedFloor ? (
              <div className="text-left">
                <p className="text-xs font-mono uppercase tracking-wider text-sidebar-foreground/70">
                  {selectedFloor.number === "B" ? "Basement" : `Floor ${selectedFloor.number}`}
                </p>
                <p className="font-medium text-sm">{selectedFloor.name}</p>
              </div>
            ) : (
              <span className="font-serif">Frontier Atlas</span>
            )}
          </div>
          <ChevronDown className="size-4 text-sidebar-foreground/50" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-2xl bg-sidebar text-sidebar-foreground border-sidebar-border"
      >
        <SheetHeader className="border-b border-sidebar-border pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
              <Building2 className="size-5 text-sidebar-primary" />
              <span className="font-serif">Tower Navigation</span>
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="py-4 border-b border-sidebar-border">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onFilterChange(btn.value)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                  filter === btn.value
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 bg-sidebar-accent"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Floor List */}
        <div className="overflow-y-auto h-[calc(100%-8rem)] py-2">
          {filteredFloors.map((floor) => (
            <SheetClose key={floor.id} asChild>
              <button
                onClick={() => onSelectFloor(floor.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-l-4 transition-all",
                  "hover:bg-sidebar-accent",
                  typeStyles[floor.type],
                  selectedFloor?.id === floor.id && "bg-sidebar-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{floor.icon}</span>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-sidebar-foreground/70">
                      {floor.number === "B" ? "Basement" : `Floor ${floor.number}`}
                    </p>
                    <p className="font-medium text-sm">{floor.name}</p>
                  </div>
                </div>
              </button>
            </SheetClose>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
