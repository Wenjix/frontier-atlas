"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { TowerSpine } from "@/components/tower-spine"
import { FloorBento } from "@/components/floor-bento"
import { LobbyView } from "@/components/lobby-view"
import { MobileNav } from "@/components/mobile-nav"
import { getFloorById, type FloorType } from "@/lib/floor-data"
import { cn } from "@/lib/utils"
import { Search, Inbox } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { OnboardingFlow } from "@/components/onboarding-flow"

export default function TowerAtlasPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | FloorType>("all")
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  const isAuthenticated = status === "authenticated"
  const hasMember = !!session?.user?.memberId

  const selectedFloor = selectedFloorId ? getFloorById(selectedFloorId) : null

  const handleSelectFloor = (floorId: string) => {
    setSelectedFloorId(floorId)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <MobileNav
          selectedFloor={selectedFloor ?? null}
          onSelectFloor={handleSelectFloor}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Tower Spine - Left Panel (320-336px per spec) */}
        <div className="w-[336px] shrink-0">
          <TowerSpine
            selectedFloor={selectedFloorId}
            onSelectFloor={handleSelectFloor}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar (minimal per spec) */}
          <header className="h-14 shrink-0 border-b border-border/50 flex items-center justify-between px-6 bg-background">
            {/* Left - Wordmark (subtle) */}
            <div className="w-32">
              <span className="text-sm font-serif text-muted-foreground">Frontier Atlas</span>
            </div>
            
            {/* Center - Global Search */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                <Input 
                  type="text"
                  placeholder="Search people, floors, asks, events"
                  className="pl-9 h-9 bg-muted/30 border-border/50 text-sm placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            
            {/* Right - Primary CTA */}
            <div className="flex justify-end gap-2">
              {status === "loading" ? (
                <div className="w-24 h-9" />
              ) : (
                <>
                  {isAuthenticated && hasMember && (
                    <Button variant="ghost" size="sm" className="text-sm" onClick={() => router.push("/inbox")}>
                      <Inbox className="size-4 mr-1.5" />
                      Inbox
                    </Button>
                  )}
                  {isAuthenticated && hasMember ? (
                    <Button size="sm" className="text-sm" onClick={() => setOnboardingOpen(true)}>
                      Edit profile
                    </Button>
                  ) : isAuthenticated && !hasMember ? (
                    <Button size="sm" className="text-sm" onClick={() => setOnboardingOpen(true)}>
                      Start your profile
                    </Button>
                  ) : (
                    <Button size="sm" className="text-sm" onClick={() => signIn()}>
                      Sign in
                    </Button>
                  )}
                </>
              )}
            </div>
          </header>

          {/* Floor Bento Panel */}
          <main className={cn(
            "flex-1 overflow-hidden transition-all duration-500"
          )}>
            {selectedFloor ? (
<FloorBento 
              key={selectedFloor.id}
              floor={selectedFloor}
              onPersonClick={(id) => console.log("Person clicked:", id)}
              onEventClick={(id) => console.log("Event clicked:", id)}
              onBack={() => setSelectedFloorId(null)}
            />
            ) : (
              <LobbyView onSelectFloor={handleSelectFloor} />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden pt-20 min-h-screen">
        {selectedFloor ? (
          <FloorBento 
            key={selectedFloor.id}
            floor={selectedFloor}
            onPersonClick={(id) => console.log("Person clicked:", id)}
            onEventClick={(id) => console.log("Event clicked:", id)}
            onBack={() => setSelectedFloorId(null)}
          />
        ) : (
          <LobbyView onSelectFloor={handleSelectFloor} onStartProfile={() => setOnboardingOpen(true)} />
        )}
      </div>

      {/* Onboarding Flow */}
      <OnboardingFlow 
        open={onboardingOpen} 
        onOpenChange={setOnboardingOpen}
        floorName={selectedFloor?.name ?? "Frontier"}
      />
    </div>
  )
}
