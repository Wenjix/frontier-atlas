"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { type FloorDefinition, type FloorType } from "@/lib/floor-data"
import { api, ApiError } from "@/lib/api-client"
import { introReasonMap, connectionMap } from "@/lib/enum-maps"
import { toast } from "sonner"
import {
  Calendar,
  User,
  ArrowRight,
  MessageSquarePlus,
  UserPlus,
  ChevronLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RequestIntroSheet } from "@/components/request-intro-flow"

// Local interfaces for data shapes fetched from API
// (these were removed from floor-data.ts during the FloorDefinition rewrite)
interface FloorLead {
  id: string
  name: string
  role: string
  avatar: string | null
  helpsWith: string
}

interface FloorEvent {
  id: string
  title: string
  time: string
  host?: string
  recurring?: boolean
}

interface PersonToKnow {
  id: string
  name: string
  avatar: string
  project: string
  whyNow: string
}

interface FloorBentoProps {
  floor: FloorDefinition
  onPersonClick?: (personId: string) => void
  onEventClick?: (eventId: string) => void
  onBack?: () => void
}

function FloorBadge({ number, type }: { number: string; type: FloorType }) {
  const colors = {
    thematic: "bg-floor-thematic text-white",
    commons: "bg-floor-commons text-white",
    private: "bg-floor-private text-white",
  }
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-mono font-medium",
      colors[type]
    )}>
      {number === "B" ? "B" : number}
    </span>
  )
}

function BentoCard({ 
  children, 
  className,
  span = "1",
  ...props 
}: React.ComponentProps<typeof Card> & { span?: "1" | "5" | "7" | "12" }) {
  const spanClasses = {
    "1": "",
    "5": "md:col-span-5",
    "7": "md:col-span-7",
    "12": "md:col-span-12",
  }
  
  return (
    <Card 
      className={cn(
        "transition-all duration-300 bg-card border-border/30",
        spanClasses[span],
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
}

export function FloorBento({ floor, onPersonClick, onEventClick, onBack }: FloorBentoProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const isCommons = floor.type === "commons"
  const [introSheetOpen, setIntroSheetOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string
    name: string
    avatar: string
    intro: string
    floor?: string
    openToIntros?: boolean
  } | null>(null)

  // Live data from API
  const [liveLeads, setLiveLeads] = useState<FloorLead[] | null>(null)
  const [liveEvents, setLiveEvents] = useState<FloorEvent[] | null>(null)
  const [livePeople, setLivePeople] = useState<PersonToKnow[] | null>(null)
  const [livePulse, setLivePulse] = useState<{ signals: string[]; summary: string } | null>(null)

  useEffect(() => {
    // Fetch floor leads from DB
    api.get<Array<{ memberId: string; fullName: string; avatarUrl: string | null; role: string; helpsWith: string | null }>>(
      `/api/floors/${floor.id}/leads`
    ).then(res => {
      setLiveLeads(res.map(l => ({
        id: l.memberId,
        name: l.fullName,
        role: l.role,
        avatar: l.avatarUrl,
        helpsWith: l.helpsWith ?? "",
      })))
    }).catch(() => {
      // No fallback — leads come from DB only
    })

    // Fetch upcoming events
    api.get<{ items: Array<{ id: string; title: string; startsAt: string; hostName?: string; isRecurring?: boolean }> }>(
      `/api/floors/${floor.id}/events?upcoming=true&pageSize=4`
    ).then(res => {
      setLiveEvents(res.items.map(e => ({
        id: e.id,
        title: e.title,
        time: new Date(e.startsAt).toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }),
        host: e.hostName,
        recurring: e.isRecurring,
      })))
    }).catch(() => {
      // Fall back to static data on error
    })

    // Fetch living floor pulse
    api.get<{ signals: string[]; summary: string }>(
      `/api/floors/${floor.id}/pulse`
    ).then(res => {
      setLivePulse({ signals: res.signals, summary: res.summary })
    }).catch(() => {
      // Fall back to static data on error
    })

    // Fetch featured people (requires auth)
    if (session?.user) {
      api.get<{ items: Array<{ id: string; fullName: string; avatarUrl?: string | null; oneLineIntro: string }> }>(
        `/api/floors/${floor.id}/people?pageSize=3`
      ).then(res => {
        setLivePeople(res.items.map(m => ({
          id: m.id,
          name: m.fullName,
          avatar: m.fullName.split(" ").map(n => n[0]).join(""),
          project: m.oneLineIntro,
          whyNow: "On this floor",
        })))
      }).catch(() => {
        // Fall back to static data on error
      })
    }
  }, [floor.id, session?.user])

  const displayLeads = liveLeads ?? []
  const displayEvents = liveEvents ?? []
  const displayPeople = livePeople ?? []
  const displayPulse = livePulse ?? { signals: [], summary: "" }

  const handleRequestIntro = (person: typeof selectedPerson) => {
    setSelectedPerson(person)
    setIntroSheetOpen(true)
  }
  
  return (
    <div key={floor.id} className="h-full overflow-y-auto p-6 lg:p-8 animate-fade-slide-in">
      {/* Back to Lobby link - hidden on desktop where spine is always visible */}
      {onBack && (
        <button 
          onClick={onBack}
          className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 -ml-1 transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back to Lobby
        </button>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 max-w-5xl">
        
        {/* Card A: Floor Identity (7 cols) */}
        <BentoCard span="7" className="p-6">
          <div className="flex items-start gap-4">
            <FloorBadge number={floor.number} type={floor.type} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-[28px] font-serif tracking-tight text-foreground mb-2">
                {floor.name}
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-4 text-[15px]">
                {floor.description}
              </p>
              
              {/* Tags - smaller, max 3 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {floor.tags.slice(0, 3).map((tag, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="text-[11px] font-normal bg-secondary/40 text-secondary-foreground px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              
              {/* Best For */}
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Best for: </span>
                {floor.bestFor}
              </p>
              
              {/* Steward note */}
              {floor.character && (
                <p className="text-sm text-muted-foreground/70 mt-2 italic">
                  {floor.character}
                </p>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Card B: Happening Now (5 cols) */}
        <BentoCard span="5" className="p-5 bg-primary/[0.02]">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
              </span>
              {isCommons ? "What's Happening" : "Happening Now"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Live signals - tight list */}
            <ul className="space-y-1.5 mb-4">
              {displayPulse.signals.slice(0, 3).map((signal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground/50 mt-0.5">·</span>
                  <span className="text-foreground">{signal}</span>
                </li>
              ))}
            </ul>

            {/* Summary with subtle divider */}
            <div className="pt-3 border-t border-border/40">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayPulse.summary}
              </p>
            </div>
          </CardContent>
        </BentoCard>

        {/* Card C: Event Calendar (5 cols) */}
        <BentoCard span="5" className="p-5">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              {isCommons ? "Schedule" : "Event Calendar"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Compact agenda - 3-4 rows with tighter rhythm */}
            <div className="space-y-2">
              {displayEvents.slice(0, 4).map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event.id)}
                  className="flex items-start gap-2 w-full text-left hover:bg-muted/40 p-2 -mx-2 rounded-md transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{event.time}</span>
                      <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {event.title}
                      </p>
                      {event.recurring && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground shrink-0">
                          recurring
                        </Badge>
                      )}
                    </div>
                    {event.host && (
                      <p className="text-xs text-muted-foreground ml-20">{event.host}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {displayEvents.length > 4 && (
              <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-muted-foreground hover:text-foreground text-xs">
                See full calendar
                <ArrowRight className="size-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </BentoCard>

        {/* Card D: Floor Leads + People to Know (7 cols) */}
        <BentoCard span="7" className="p-5">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User className="size-4" />
              {isCommons ? "Hosts + People Around" : "Floor Leads + People to Know"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Floor Leads - left column */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {isCommons ? "Hosts" : "Floor Leads"}
                </p>
                <div className="space-y-3">
                  {displayLeads.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60 italic">No leads assigned yet</p>
                  ) : (
                    displayLeads.slice(0, 2).map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => onPersonClick?.(lead.id)}
                        className="flex items-start gap-3 w-full text-left hover:bg-muted/40 p-2 -mx-2 rounded-md transition-colors"
                      >
                        <Avatar className="size-9 shrink-0">
                          {lead.avatar && <AvatarImage src={lead.avatar} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.role}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {lead.helpsWith}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              {/* People to Know - right column with stronger editorial hierarchy */}
              <div className="lg:border-l lg:border-border/40 lg:pl-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {isCommons ? "People Around" : "People to Know This Week"}
                </p>
                <div className="space-y-3">
                  {displayPeople.slice(0, 2).map((person) => (
                    <div
                      key={person.id}
                      className="flex items-start gap-3 hover:bg-muted/40 p-2 -mx-2 rounded-md transition-colors group"
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {person.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.project}</p>
                            <p className="text-xs text-primary/80 mt-0.5">
                              {person.whyNow}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-7 px-2 text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-all"
                            onClick={() => handleRequestIntro({
                              id: person.id,
                              name: person.name,
                              avatar: person.avatar,
                              intro: person.project,
                              floor: `Floor ${floor.number}`,
                              openToIntros: true,
                            })}
                          >
                            <UserPlus className="size-3 mr-1" />
                            <span className="hidden sm:inline">Request </span>Intro
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-border/40">
              <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-2 text-muted-foreground hover:text-foreground text-xs"
                onClick={() => router.push(`/floors/${floor.id}/people`)}
              >
                Browse all people
                <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </BentoCard>

        {/* Card E: Action Bar (12 cols) */}
        <BentoCard span="12" className="p-4 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0">
              Ways to plug in
            </span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button size="sm" className="gap-1.5 justify-center">
                <MessageSquarePlus className="size-3.5" />
                Post an ask
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 justify-center"
                onClick={() => {
                  // Default to first person to know for the "Request intro" button
                  const firstPerson = displayPeople[0]
                  if (firstPerson) {
                    handleRequestIntro({
                      id: firstPerson.id,
                      name: firstPerson.name,
                      avatar: firstPerson.avatar,
                      intro: firstPerson.project,
                      floor: `Floor ${floor.number}`,
                      openToIntros: true,
                    })
                  }
                }}
              >
                <UserPlus className="size-3.5" />
                Request intro
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground justify-center"
                onClick={() => router.push(`/floors/${floor.id}/people`)}
              >
                Browse all people
              </Button>
            </div>
          </div>
        </BentoCard>

      </div>

      {/* Request Intro Sheet */}
      {selectedPerson && (
        <RequestIntroSheet
          open={introSheetOpen}
          onOpenChange={setIntroSheetOpen}
          person={selectedPerson}
          onSend={async (request) => {
            await api.post("/api/intro-requests", {
              recipientMemberId: selectedPerson!.id,
              reason: introReasonMap[request.reason],
              note: request.message,
              preferredConnection: connectionMap[request.connectionMode],
              linkUrl: request.link || null,
            })
            toast.success("Intro request sent!")
            setIntroSheetOpen(false)
          }}
        />
      )}
    </div>
  )
}
