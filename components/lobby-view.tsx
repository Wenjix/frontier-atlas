"use client"

import { useState, useEffect } from "react"
import { floors } from "@/lib/floor-data"
import { api } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Lightbulb, Compass } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivitySummary {
  totalActiveMembers: number
  recentlyActiveCount: number
  activeFloorCount: number
  upcomingEventCount: number
  floorMemberCounts: Record<string, number>
}

interface SuggestedPerson {
  id: string
  fullName: string
  avatarUrl: string | null
  oneLineIntro: string
  workingOn: string | null
  sharedTopicCount: number
}

interface SuggestedEvent {
  id: string
  title: string
  startsAt: string
  floorNumber: string
  floorName: string
}

interface SuggestedPeopleResponse {
  people: SuggestedPerson[]
  events: SuggestedEvent[]
}

interface LobbyViewProps {
  onSelectFloor: (floorId: string) => void
  onStartProfile?: () => void
  isAuthenticated?: boolean
}

export function LobbyView({ onSelectFloor, onStartProfile, isAuthenticated }: LobbyViewProps) {
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null)
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPerson[] | null>(null)
  const [suggestedEvents, setSuggestedEvents] = useState<SuggestedEvent[] | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated — show empty states instead of loading indicators
      setSuggestedPeople([])
      setSuggestedEvents([])
      return
    }

    api.get<ActivitySummary>("/api/tower/activity-summary").then(res => {
      setActivitySummary(res)
    }).catch(() => {
      // No summary available
    })

    api.get<SuggestedPeopleResponse>("/api/me/suggested-people?limit=3").then(res => {
      setSuggestedPeople(res.people)
      setSuggestedEvents(res.events)
    }).catch(() => {
      // API unavailable — show empty states
      setSuggestedPeople([])
      setSuggestedEvents([])
    })
  }, [isAuthenticated])

  // Featured floors for Card C
  const featuredFloors = [
    floors.find(f => f.id === "floor-9"),  // AI
    floors.find(f => f.id === "floor-16"), // Cross-Pollination
    floors.find(f => f.id === "floor-7"),  // Makerspace
  ].filter(Boolean)

  // Tonight/Today events from API
  const todayEvents = suggestedEvents
    ? suggestedEvents.map(e => ({
        id: e.id,
        title: e.title,
        time: new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        floorName: e.floorName,
        floorNumber: e.floorNumber,
        floorId: `floor-${e.floorNumber}`,
      }))
    : null

  // People to know from API
  const peopleToKnow = suggestedPeople
    ? suggestedPeople.map(p => ({
        name: p.fullName,
        initials: p.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        reason: p.oneLineIntro || (p.workingOn ? `working on ${p.workingOn}` : "active in the tower"),
        avatarUrl: p.avatarUrl,
        sharedTopicCount: p.sharedTopicCount,
      }))
    : null

  // Good places to start for Card G
  const placesToStart = [
    { floor: "Floor 15", text: "if you want open coworking", floorId: "floor-15" },
    { floor: "Floor 9", text: "for technical builder energy", floorId: "floor-9" },
    { floor: "Floor 16", text: "for casual collisions", floorId: "floor-16" },
  ]

  const typeColors = {
    thematic: "border-l-floor-thematic",
    commons: "border-l-floor-commons",
    private: "border-l-floor-private",
  }

  return (
    <div className="h-full overflow-y-auto animate-fade-in">
      <div className="p-6 lg:p-8 max-w-5xl">
        {/* Bento Grid Layout per spec */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
          
          {/* Card A: Welcome to the Tower (8 cols) */}
          <Card className="md:col-span-8 border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              <h1 className="text-3xl lg:text-4xl font-serif tracking-tight text-foreground mb-3 text-balance">
                Welcome to the Tower
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-2">
                A living community of builders, thinkers, and makers across 16 floors.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Explore floors, find what{"'"}s active, and make yourself visible across the building.
              </p>
              {activitySummary ? (
                <p className="text-sm text-muted-foreground/70">
                  {activitySummary.totalActiveMembers} people active across {activitySummary.activeFloorCount} floors
                  {activitySummary.upcomingEventCount > 0 && (
                    <> &middot; {activitySummary.upcomingEventCount} upcoming {activitySummary.upcomingEventCount === 1 ? "event" : "events"}</>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/70">
                  Thematic floors, commons spaces, and private offices
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card B: Tonight / Today (4 cols) */}
          <Card className="md:col-span-4 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="size-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">Tonight / Today</h2>
              </div>
              <div className="space-y-3">
                {todayEvents ? (
                  todayEvents.length > 0 ? (
                    todayEvents.slice(0, 3).map((event, i) => (
                      <button
                        key={i}
                        onClick={() => onSelectFloor(event.floorId)}
                        className="flex items-start gap-2 w-full text-left hover:bg-muted/50 p-1.5 -mx-1.5 rounded-md transition-colors group"
                      >
                        <span className="text-xs text-muted-foreground shrink-0 w-12">{event.time.split(",")[0]}</span>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          Floor {event.floorNumber} · {event.title}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No events scheduled today</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading events...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card C: Featured Floors (7 cols) */}
          <Card className="md:col-span-7 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Compass className="size-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">Featured Floors</h2>
              </div>
              <div className="space-y-3">
                {featuredFloors.map((floor) => floor && (
                  <button
                    key={floor.id}
                    onClick={() => onSelectFloor(floor.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      "hover:shadow-md hover:-translate-y-0.5 border-l-4",
                      typeColors[floor.type]
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-mono text-muted-foreground">{floor.number}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground">{floor.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {floor.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card D: Start Your Profile (5 cols) */}
          <Card className="md:col-span-5 bg-primary/[0.04] border-primary/10">
            <CardContent className="p-5">
              <h2 className="text-lg font-serif text-foreground mb-2">Start Your Profile</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Tell the tower who you are, what you{"'"}re building, and what you need.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-xs px-2 py-1 bg-secondary/60 rounded-full text-secondary-foreground">
                  what you{"'"}re building
                </span>
                <span className="text-xs px-2 py-1 bg-secondary/60 rounded-full text-secondary-foreground">
                  what you can help with
                </span>
                <span className="text-xs px-2 py-1 bg-secondary/60 rounded-full text-secondary-foreground">
                  who you want to meet
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={onStartProfile}>Get started</Button>
              </div>
            </CardContent>
          </Card>

          {/* Card E: New Here? (4 cols) */}
          <Card className="md:col-span-4 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="size-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">New Here?</h2>
              </div>
              <ol className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="size-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Find your home floor</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="size-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Add what you{"'"}re building</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="size-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Get people to meet</span>
                </li>
              </ol>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={onStartProfile}>
                Show me how
              </Button>
            </CardContent>
          </Card>

          {/* Card F: People to Know (4 cols) */}
          <Card className="md:col-span-4 bg-card">
            <CardContent className="p-5">
              <h2 className="text-sm font-medium text-foreground mb-4">People to Know</h2>
              <div className="space-y-3">
                {peopleToKnow ? (
                  peopleToKnow.length > 0 ? (
                    peopleToKnow.map((person, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {person.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{person.name}</p>
                          <p className="text-xs text-muted-foreground">{person.reason}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete your profile to get suggestions</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading suggestions...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card G: Good Places to Start (4 cols) */}
          <Card className="md:col-span-4 bg-card">
            <CardContent className="p-5">
              <h2 className="text-sm font-medium text-foreground mb-4">Good Places to Start</h2>
              <div className="space-y-2.5">
                {placesToStart.map((place, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectFloor(place.floorId)}
                    className="flex items-start gap-2 w-full text-left hover:bg-muted/50 p-1.5 -mx-1.5 rounded-md transition-colors group text-sm"
                  >
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      Start on {place.floor}
                    </span>
                    <span className="text-muted-foreground">{place.text}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
