"use client"

import { useEffect, useState, useCallback, useRef, use } from "react"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Search } from "lucide-react"
import type { MemberListItem, MemberDetail } from "@/lib/member-data"

interface FloorInfo {
  id: string
  number: string
  name: string
}

export default function TelegramFloorPeoplePage({
  params,
}: {
  params: Promise<{ floorId: string }>
}) {
  const { floorId } = use(params)
  const { webApp, isLoading: authLoading } = useTelegram()
  const [floor, setFloor] = useState<FloorInfo | null>(null)
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (webApp) {
      webApp.BackButton.show()
      const handleBack = () => window.history.back()
      webApp.BackButton.onClick(handleBack)
      return () => {
        webApp.BackButton.offClick(handleBack)
        webApp.BackButton.hide()
      }
    }
  }, [webApp])

  const fetchPeople = useCallback(
    async (pageNum: number, searchQuery: string, append = false) => {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          pageSize: "20",
        })
        if (searchQuery) params.set("q", searchQuery)

        const data = await telegramApi.get<{
          floor: FloorInfo
          members: MemberListItem[]
          totalCount: number
        }>(`/api/floors/${floorId}/people?${params}`)

        setFloor(data.floor)
        setMembers((prev) => (append ? [...prev, ...data.members] : data.members))
        setTotalCount(data.totalCount)
      } catch (err) {
        if (!append) {
          setFetchError(err instanceof Error ? err.message : "Failed to load people")
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [floorId]
  )

  useEffect(() => {
    if (authLoading) return
    fetchPeople(1, debouncedSearch)
  }, [authLoading, fetchPeople, debouncedSearch])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 350)
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPeople(nextPage, search, true)
  }

  const handleMemberClick = async (memberId: string) => {
    setLoadingDetail(true)
    setSheetOpen(true)
    try {
      const detail = await telegramApi.get<MemberDetail>(`/api/members/${memberId}`)
      setSelectedMember(detail)
    } catch {
      setSheetOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  if (fetchError && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <p className="text-muted-foreground">{fetchError}</p>
        <Button variant="outline" onClick={() => { setFetchError(null); fetchPeople(1, debouncedSearch) }}>
          Try again
        </Button>
      </div>
    )
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-6 pt-4 pb-3 border-b border-border/50 space-y-3">
        <h1 className="text-lg font-semibold">
          {floor ? `Floor ${floor.number}: ${floor.name}` : "People"}
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">{totalCount} members</p>
      </div>

      {/* Member List */}
      <div className="flex-1 p-4 space-y-2">
        {members.map((member) => (
          <Card
            key={member.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleMemberClick(member.id)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={member.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {member.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{member.fullName}</p>
                  {member.contextSignal && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {member.contextSignal === "new"
                        ? "New"
                        : member.contextSignal === "open_to_meet"
                          ? "Open to meet"
                          : "Hosting soon"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.oneLineIntro}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {members.length < totalCount && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Load more
          </Button>
        )}

        {members.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            {search ? "No members match your search." : "No members yet."}
          </p>
        )}
      </div>

      {/* Member Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {loadingDetail ? "Loading..." : selectedMember?.fullName ?? "Member"}
            </SheetTitle>
          </SheetHeader>

          {loadingDetail && (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          )}

          {!loadingDetail && selectedMember && (
            <div className="space-y-5 pt-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-14">
                  <AvatarImage src={selectedMember.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {selectedMember.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedMember.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.oneLineIntro}</p>
                </div>
              </div>

              {selectedMember.workingOn && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Working on</p>
                  <p className="text-sm">{selectedMember.workingOn}</p>
                </div>
              )}

              {selectedMember.curiousAbout && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Curious about</p>
                  <p className="text-sm">{selectedMember.curiousAbout}</p>
                </div>
              )}

              {selectedMember.topics && selectedMember.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMember.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}

              {selectedMember.wantsToMeet && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Wants to meet</p>
                  <p className="text-sm">{selectedMember.wantsToMeet}</p>
                </div>
              )}

              {selectedMember.canHelpWith && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Can help with</p>
                  <p className="text-sm">{selectedMember.canHelpWith}</p>
                </div>
              )}

              {selectedMember.needsHelpWith && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Needs help with</p>
                  <p className="text-sm">{selectedMember.needsHelpWith}</p>
                </div>
              )}

              {selectedMember.conversationStarter && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Conversation starter</p>
                  <p className="text-sm">{selectedMember.conversationStarter}</p>
                </div>
              )}

              {selectedMember.websiteUrl && (
                <a
                  href={selectedMember.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  {selectedMember.websiteUrl}
                </a>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
