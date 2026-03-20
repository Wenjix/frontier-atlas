"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Search,
  X,
  ExternalLink,
  UserPlus,
  Sparkles
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type MemberListItem,
  type MemberDetail,
  type FeaturedMember,
  type FloorPeopleData,
} from "@/lib/member-data"
import { RequestIntroSheet } from "@/components/request-intro-flow"
import { api } from "@/lib/api-client"
import { introReasonMap, connectionMap } from "@/lib/enum-maps"
import { toast } from "sonner"

// ============================================
// FloorPeopleHeader
// ============================================
interface FloorPeopleHeaderProps {
  floorNumber: string
  title: string
  subtitle: string
  onBack: () => void
}

function FloorPeopleHeader({ floorNumber, title, subtitle, onBack }: FloorPeopleHeaderProps) {
  return (
    <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="px-6 py-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-4" />
          Back to floor
        </button>
        <h1 className="text-xl font-serif tracking-tight text-foreground">
          People on Floor {floorNumber}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle}
        </p>
      </div>
    </header>
  )
}

// ============================================
// PeopleSearchInput
// ============================================
interface PeopleSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function PeopleSearchInput({ value, onChange, placeholder = "Search people on this floor" }: PeopleSearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-10 bg-muted/30 border-border/40 text-foreground placeholder:text-muted-foreground/60"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

// ============================================
// FeaturedPeopleStrip
// ============================================
interface FeaturedPeopleStripProps {
  items: FeaturedMember[]
  onSelectMember: (memberId: string) => void
}

function FeaturedPeopleStrip({ items, onSelectMember }: FeaturedPeopleStripProps) {
  if (items.length === 0) return null
  
  return (
    <section className="mb-6">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        People to Know This Week
      </h2>
      <div className="space-y-1">
        {items.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelectMember(member.id)}
            className="flex items-center gap-3 w-full text-left hover:bg-muted/40 p-2 -mx-2 rounded-md transition-colors"
          >
            <Avatar className="size-7 shrink-0">
              {member.avatarUrl ? (
                <AvatarImage src={member.avatarUrl} alt={member.fullName} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {member.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-sm text-foreground">{member.fullName}</span>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm text-muted-foreground">{member.reason}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ============================================
// ContextSignalBadge
// ============================================
function ContextSignalBadge({ signal }: { signal: "new" | "open_to_meet" | "hosting_soon" }) {
  const labels = {
    new: "New",
    open_to_meet: "Open to meet",
    hosting_soon: "Hosting soon"
  }
  
  return (
    <Badge 
      variant="outline" 
      className="text-[10px] font-normal px-1.5 py-0 h-4 text-muted-foreground border-border/50"
    >
      {labels[signal]}
    </Badge>
  )
}

// ============================================
// MemberDirectoryRow
// ============================================
interface MemberDirectoryRowProps {
  member: MemberListItem
  onClick: () => void
  onRequestIntro: (e: React.MouseEvent) => void
}

function MemberDirectoryRow({ member, onClick, onRequestIntro }: MemberDirectoryRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className="flex items-center gap-4 py-4 px-2 -mx-2 hover:bg-muted/40 rounded-md transition-colors cursor-pointer group border-b border-border/20 last:border-0"
      aria-label={`${member.fullName}, ${member.oneLineIntro}${member.contextSignal ? `, ${member.contextSignal.replace('_', ' ')}` : ''}`}
    >
      {/* Avatar */}
      <Avatar className="size-10 shrink-0">
        {member.avatarUrl ? (
          <AvatarImage src={member.avatarUrl} alt={member.fullName} />
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
            {member.fullName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        )}
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{member.fullName}</span>
          {member.contextSignal && (
            <ContextSignalBadge signal={member.contextSignal} />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {member.oneLineIntro}
        </p>
      </div>
      
      {/* Intro action */}
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-xs h-8 px-3 shrink-0"
        onClick={onRequestIntro}
        aria-label={`Request intro to ${member.fullName}`}
      >
        <UserPlus className="size-3.5 mr-1.5" />
        Intro
      </Button>
    </div>
  )
}

// ============================================
// MemberDirectoryList
// ============================================
interface MemberDirectoryListProps {
  members: MemberListItem[]
  onSelectMember: (memberId: string) => void
  onRequestIntro: (memberId: string) => void
}

function MemberDirectoryList({ members, onSelectMember, onRequestIntro }: MemberDirectoryListProps) {
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Everyone on this floor
      </h2>
      <div>
        {members.map((member) => (
          <MemberDirectoryRow
            key={member.id}
            member={member}
            onClick={() => onSelectMember(member.id)}
            onRequestIntro={(e) => {
              e.stopPropagation()
              onRequestIntro(member.id)
            }}
          />
        ))}
      </div>
    </section>
  )
}

// ============================================
// MemberProfileDrawer
// ============================================
interface MemberProfileDrawerProps {
  open: boolean
  member?: MemberDetail | null
  loading?: boolean
  onClose: () => void
  onRequestIntro: (memberId: string) => void
}

function MemberProfileDrawer({ open, member, loading, onClose, onRequestIntro }: MemberProfileDrawerProps) {
  const introOpennessLabels: Record<string, string> = {
    very: "Very open to intros",
    relevant: "Open if relevant",
    low: "Keeping a low profile"
  }
  
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[460px] overflow-y-auto">
        <SheetHeader className="text-left pb-4 border-b border-border/40">
          <SheetTitle className="sr-only">Member Profile</SheetTitle>
          <SheetDescription className="sr-only">
            View member details and request an introduction
          </SheetDescription>
          
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          ) : member ? (
            <div className="flex items-start gap-4">
              <Avatar className="size-16 shrink-0">
                {member.avatarUrl ? (
                  <AvatarImage src={member.avatarUrl} alt={member.fullName} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {member.fullName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-medium text-foreground">{member.fullName}</h2>
                  {member.contextSignal && (
                    <ContextSignalBadge signal={member.contextSignal} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{member.oneLineIntro}</p>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {introOpennessLabels[member.introOpenness]}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </SheetHeader>
        
        {loading ? (
          <div className="py-6 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : member ? (
          <>
            <div className="py-6 space-y-6">
              {/* Working on */}
              {member.workingOn && (
                <ProfileSection title="Working on" content={member.workingOn} />
              )}
              
              {/* Curious about */}
              {member.curiousAbout && (
                <ProfileSection title="Curious about" content={member.curiousAbout} />
              )}
              
              {/* Looking to meet */}
              {member.wantsToMeet && (
                <ProfileSection title="Looking to meet" content={member.wantsToMeet} />
              )}
              
              {/* Happy to help with */}
              {member.canHelpWith && (
                <ProfileSection title="Happy to help with" content={member.canHelpWith} />
              )}
              
              {/* Would love help with */}
              {member.needsHelpWith && (
                <ProfileSection title="Would love help with" content={member.needsHelpWith} />
              )}
              
              {/* Conversation starter */}
              {member.conversationStarter && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm text-foreground italic">
                    "{member.conversationStarter}"
                  </p>
                </div>
              )}
              
              {/* Website */}
              {member.websiteUrl && (
                <a 
                  href={member.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  {member.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            
            {/* Actions */}
            <div className="pt-4 border-t border-border/40 flex gap-3">
              <Button 
                className="flex-1"
                onClick={() => onRequestIntro(member.id)}
              >
                <UserPlus className="size-4 mr-2" />
                Request intro
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ProfileSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-foreground leading-relaxed">{content}</p>
    </div>
  )
}

// ============================================
// Loading State
// ============================================
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Featured section skeleton */}
      <section>
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
      
      {/* Directory skeleton */}
      <section>
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="space-y-0">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-border/20">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ============================================
// Empty States
// ============================================
function EmptySearchState({ onClear }: { onClear: () => void }) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-foreground mb-2">No people found</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Try another name or keyword.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear search
      </Button>
    </div>
  )
}

function EmptyFloorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-foreground mb-2">No people yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Once members on this floor set up their profiles, they'll appear here.
      </p>
      <Button variant="outline" size="sm" onClick={onBack}>
        Back to floor
      </Button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-foreground mb-2">Couldn't load people</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Please try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

// ============================================
// Main FloorPeoplePage Component
// ============================================
interface FloorPeoplePageProps {
  data: FloorPeopleData
  floorId: string
  onBack: () => void
}

export function FloorPeoplePage({ data, floorId, onBack }: FloorPeoplePageProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MemberListItem[] | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null)
  const [memberDetailLoading, setMemberDetailLoading] = useState(false)
  const [introSheetOpen, setIntroSheetOpen] = useState(false)
  const [introTargetMember, setIntroTargetMember] = useState<{
    id: string
    name: string
    avatar: string
    intro: string
  } | null>(null)

  // Display members: search results or initial data
  const filteredMembers = searchResults ?? data.members

  // Debounced search via API
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }

    searchTimerRef.current = setTimeout(() => {
      api.get<{ items: MemberListItem[] }>(
        `/api/floors/${floorId}/people?q=${encodeURIComponent(searchQuery)}`
      ).then(res => {
        setSearchResults(res.items)
      }).catch(() => {
        // Fall back to client-side filter on error
        const query = searchQuery.toLowerCase()
        setSearchResults(
          data.members.filter(m =>
            m.fullName.toLowerCase().includes(query) ||
            m.oneLineIntro.toLowerCase().includes(query)
          )
        )
      })
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, floorId, data.members])

  // Load member detail when selected
  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId)
    setIsDrawerOpen(true)
    setMemberDetailLoading(true)

    api.get<MemberDetail>(`/api/members/${memberId}`)
      .then((detail) => {
        setMemberDetail(detail)
      })
      .catch(() => {
        toast.error("Failed to load member profile")
        setIsDrawerOpen(false)
      })
      .finally(() => {
        setMemberDetailLoading(false)
      })
  }, [])

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])

  // Request intro — find member in current list or search results
  const handleRequestIntro = useCallback((memberId: string) => {
    const allMembers = [...data.members, ...(searchResults ?? [])]
    const member = allMembers.find(m => m.id === memberId)
    if (member) {
      setIntroTargetMember({
        id: member.id,
        name: member.fullName,
        avatar: member.fullName.split(' ').map(n => n[0]).join(''),
        intro: member.oneLineIntro
      })
      setIntroSheetOpen(true)
    }
  }, [data.members, searchResults])
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <FloorPeopleHeader
        floorNumber={data.floor.number}
        title={`People on Floor ${data.floor.number}`}
        subtitle={data.floor.shortDescription}
        onBack={onBack}
      />
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-2xl">
          {/* Search */}
          <div className="mb-6">
            <PeopleSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          
          {/* Featured people strip (only when not searching) */}
          {!searchQuery && data.featuredMembers && data.featuredMembers.length > 0 && (
            <FeaturedPeopleStrip
              items={data.featuredMembers}
              onSelectMember={handleSelectMember}
            />
          )}
          
          {/* Directory */}
          {filteredMembers.length > 0 ? (
            <MemberDirectoryList
              members={filteredMembers}
              onSelectMember={handleSelectMember}
              onRequestIntro={handleRequestIntro}
            />
          ) : searchQuery ? (
            <EmptySearchState onClear={() => setSearchQuery("")} />
          ) : (
            <EmptyFloorState onBack={onBack} />
          )}
        </div>
      </div>
      
      {/* Profile Drawer */}
      <MemberProfileDrawer
        open={isDrawerOpen}
        member={memberDetail}
        loading={memberDetailLoading}
        onClose={handleCloseDrawer}
        onRequestIntro={handleRequestIntro}
      />
      
      {/* Request Intro Sheet */}
      {introTargetMember && (
        <RequestIntroSheet
          open={introSheetOpen}
          onOpenChange={setIntroSheetOpen}
          person={introTargetMember}
          onSend={async (request) => {
            await api.post("/api/intro-requests", {
              recipientMemberId: introTargetMember.id,
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
