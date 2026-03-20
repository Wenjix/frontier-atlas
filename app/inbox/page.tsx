"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IntroRequestCard,
  AcceptIntroModal,
  NotNowModal,
  PassModal,
  SuggestPathModal,
  AcceptedResponseCard,
  NotNowResponseCard,
  PassedResponseCard,
  AlternatePathResponseCard,
} from "@/components/request-intro-flow"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Bell } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { introStatusReverseMap, introReasonMap, connectionReverseMap } from "@/lib/enum-maps"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

// API types
interface ApiIntroRequest {
  id: string
  requesterMemberId: string
  recipientMemberId: string
  reason: string
  note: string
  preferredConnection: string
  linkUrl?: string | null
  status: string
  recipientResponseNote?: string | null
  alternatePathType?: string | null
  alternatePathUrl?: string | null
  createdAt: string
  respondedAt?: string | null
  requester?: {
    id: string
    fullName: string
    avatarUrl?: string | null
    profile?: { oneLineIntro?: string | null } | null
  }
  recipient?: {
    id: string
    fullName: string
    avatarUrl?: string | null
    profile?: { oneLineIntro?: string | null } | null
  }
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

interface SuggestionData {
  people: SuggestedPerson[]
  events: SuggestedEvent[]
}

type Tab = "received" | "sent"

function mapConnectionToFrontend(conn: string): "async" | "chat-15" | "event" | "open" {
  return ((connectionReverseMap as Record<string, string>)[conn] ?? "open") as "async" | "chat-15" | "event" | "open"
}

function mapReasonToFrontend(reason: string): "feedback" | "collaboration" | "learning" | "shared-interest" | "event-follow-up" | "other" {
  const reverseReasonMap: Record<string, string> = {}
  for (const [k, v] of Object.entries(introReasonMap)) {
    reverseReasonMap[v] = k
  }
  return (reverseReasonMap[reason] || "other") as "feedback" | "collaboration" | "learning" | "shared-interest" | "event-follow-up" | "other"
}

function mapStatus(status: string): "pending" | "accepted" | "not-now" | "passed" | "alternate-path" {
  return ((introStatusReverseMap as Record<string, string>)[status] ?? "pending") as "pending" | "accepted" | "not-now" | "passed" | "alternate-path"
}

function toFrontendRequest(item: ApiIntroRequest, direction: "received" | "sent") {
  const person = direction === "received" ? item.requester : item.recipient
  return {
    id: item.id,
    from: {
      id: direction === "received" ? (item.requester?.id ?? "") : "",
      name: direction === "received" ? (item.requester?.fullName ?? "Unknown") : "You",
      avatar: direction === "received"
        ? (item.requester?.fullName ?? "?").split(" ").map(n => n[0]).join("")
        : "Y",
      intro: (direction === "received"
        ? item.requester?.profile?.oneLineIntro
        : "") ?? "",
    },
    to: {
      id: direction === "sent" ? (item.recipient?.id ?? "") : "",
      name: direction === "sent" ? (item.recipient?.fullName ?? "Unknown") : "You",
      avatar: direction === "sent"
        ? (item.recipient?.fullName ?? "?").split(" ").map(n => n[0]).join("")
        : "Y",
      intro: (direction === "sent"
        ? item.recipient?.profile?.oneLineIntro
        : "") ?? "",
    },
    reason: mapReasonToFrontend(item.reason),
    message: item.note,
    connectionMode: mapConnectionToFrontend(item.preferredConnection),
    link: item.linkUrl ?? undefined,
    status: mapStatus(item.status),
    response: {
      note: item.recipientResponseNote ?? undefined,
      alternatePath: item.alternatePathType ?? undefined,
      alternateNote: item.recipientResponseNote ?? undefined,
    },
  }
}

const ALTERNATE_PATH_TYPE_MAP: Record<string, string> = {
  "Meet me at an upcoming event": "MEET_AT_EVENT",
  "Send me a shorter async question": "SEND_ASYNC_QUESTION",
  "Follow up in a couple of weeks": "FOLLOW_UP_LATER",
  "Another option": "OTHER",
}

export default function InboxPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("received")
  const [receivedRequests, setReceivedRequests] = useState<ReturnType<typeof toFrontendRequest>[]>([])
  const [sentRequests, setSentRequests] = useState<ReturnType<typeof toFrontendRequest>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<"accept" | "not-now" | "pass" | "suggest-path" | null>(null)
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [activeRequestPerson, setActiveRequestPerson] = useState<{ id: string; name: string; avatar: string; intro: string } | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [received, sent] = await Promise.all([
        api.get<{ items: ApiIntroRequest[]; total: number }>("/api/me/intro-requests/received"),
        api.get<{ items: ApiIntroRequest[]; total: number }>("/api/me/intro-requests/sent"),
      ])
      setReceivedRequests(received.items.map(i => toFrontendRequest(i, "received")))
      setSentRequests(sent.items.map(i => toFrontendRequest(i, "sent")))

      // Fetch notification count
      api.get<{ items: Array<{ read: boolean }> }>("/api/me/notifications").then(res => {
        setNotificationCount(res.items.filter(n => !n.read).length)
      }).catch(() => {})

      // Fetch suggestions for rejection recovery (Opportunity 3)
      api.get<SuggestionData>("/api/me/suggested-people").then(res => {
        setSuggestions(res)
      }).catch(() => {})
    } catch {
      toast.error("Failed to load inbox")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openModal = (requestId: string, modal: "accept" | "not-now" | "pass" | "suggest-path", person: { id: string; name: string; avatar: string; intro: string }) => {
    setActiveRequestId(requestId)
    setActiveRequestPerson(person)
    setActiveModal(modal)
  }

  const handleRespond = async (action: string, extra?: Record<string, unknown>) => {
    if (!activeRequestId) return
    try {
      await api.post(`/api/intro-requests/${activeRequestId}/respond`, {
        action,
        ...extra,
      })
      toast.success("Response sent")
      setActiveModal(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to respond")
    }
  }

  const handleKeepExploring = () => {
    router.push("/")
  }

  const renderRequestList = (requests: ReturnType<typeof toFrontendRequest>[], direction: Tab) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )
    }

    if (requests.length === 0) {
      return (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-foreground mb-2">
            {direction === "received" ? "No requests yet" : "No sent requests"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {direction === "received"
              ? "When someone requests an intro with you, it'll show up here."
              : "When you request an intro, it'll show up here."}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {requests.map((req) => {
          if (direction === "received" && req.status === "pending") {
            return (
              <IntroRequestCard
                key={req.id}
                request={req}
                onAccept={() => openModal(req.id, "accept", req.from)}
                onNotNow={() => openModal(req.id, "not-now", req.from)}
                onPass={() => openModal(req.id, "pass", req.from)}
                onSuggestPath={() => openModal(req.id, "suggest-path", req.from)}
              />
            )
          }

          if (req.status === "accepted") {
            return (
              <AcceptedResponseCard
                key={req.id}
                request={req}
                onViewProfile={(memberId) => router.push(`/members/${memberId}`)}
              />
            )
          }
          if (req.status === "not-now") {
            return (
              <NotNowResponseCard
                key={req.id}
                request={req}
                suggestions={suggestions}
                onKeepExploring={handleKeepExploring}
              />
            )
          }
          if (req.status === "passed") {
            return (
              <PassedResponseCard
                key={req.id}
                request={req}
                suggestions={suggestions}
                onKeepExploring={handleKeepExploring}
              />
            )
          }
          if (req.status === "alternate-path") {
            return <AlternatePathResponseCard key={req.id} request={req} />
          }

          // Pending sent requests — show as a simple card
          return (
            <div key={req.id} className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {req.to.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground">{req.to.name}</p>
                  <p className="text-sm text-muted-foreground">{req.to.intro}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Status: {req.status.replace("-", " ")}
              </p>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="size-9">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-serif text-lg">Inbox</h1>
              <p className="text-sm text-muted-foreground">Intro requests and notifications</p>
            </div>
          </div>
          <button
            aria-label={notificationCount > 0 ? `${notificationCount} unread notifications` : "Notifications"}
            className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <Bell className="size-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Tabs + Content */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="max-w-2xl mx-auto px-6 pt-6">
        <TabsList className="bg-muted/30 w-fit">
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="py-6">
          {renderRequestList(receivedRequests, "received")}
        </TabsContent>
        <TabsContent value="sent" className="py-6">
          {renderRequestList(sentRequests, "sent")}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AcceptIntroModal
        open={activeModal === "accept"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        person={activeRequestPerson ?? { id: "", name: "", avatar: "", intro: "" }}
        onSend={(method, note) => handleRespond("ACCEPTED", { responseNote: note ? `[${method}] ${note}` : `[${method}]` })}
      />

      <NotNowModal
        open={activeModal === "not-now"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSend={(reason, note) => handleRespond("NOT_NOW", { responseNote: note || reason })}
      />

      <PassModal
        open={activeModal === "pass"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onPass={(note) => handleRespond("PASSED", { responseNote: note })}
      />

      <SuggestPathModal
        open={activeModal === "suggest-path"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSend={(path, note, event) =>
          handleRespond("ALTERNATE_PATH", {
            responseNote: note,
            alternatePathType: ALTERNATE_PATH_TYPE_MAP[path] || "OTHER",
            alternatePathUrl: event || null,
          })
        }
      />
    </div>
  )
}
