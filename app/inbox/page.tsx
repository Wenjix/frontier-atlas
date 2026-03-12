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
import { ArrowLeft, Bell } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { introStatusReverseMap, introReasonMap, connectionReverseMap } from "@/lib/enum-maps"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
  const [tab, setTab] = useState<Tab>("received")
  const [receivedRequests, setReceivedRequests] = useState<ReturnType<typeof toFrontendRequest>[]>([])
  const [sentRequests, setSentRequests] = useState<ReturnType<typeof toFrontendRequest>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<"accept" | "not-now" | "pass" | "suggest-path" | null>(null)
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [activeRequestPerson, setActiveRequestPerson] = useState<{ id: string; name: string; avatar: string; intro: string } | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)

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

  const displayRequests = tab === "received" ? receivedRequests : sentRequests

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
          <div className="relative">
            <Bell className="size-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("received")}
            className={cn(
              "px-4 py-1.5 text-sm rounded-md transition-colors",
              tab === "received" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Received
          </button>
          <button
            onClick={() => setTab("sent")}
            className={cn(
              "px-4 py-1.5 text-sm rounded-md transition-colors",
              tab === "sent" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sent
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-6">
        {loading ? (
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
        ) : displayRequests.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {tab === "received" ? "No requests yet" : "No sent requests"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tab === "received"
                ? "When someone requests an intro with you, it'll show up here."
                : "When you request an intro, it'll show up here."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayRequests.map((req) => {
              if (tab === "received" && req.status === "pending") {
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
                return <AcceptedResponseCard key={req.id} request={req} />
              }
              if (req.status === "not-now") {
                return <NotNowResponseCard key={req.id} request={req} />
              }
              if (req.status === "passed") {
                return <PassedResponseCard key={req.id} request={req} />
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
        )}
      </main>

      {/* Modals */}
      <AcceptIntroModal
        open={activeModal === "accept"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        person={activeRequestPerson ?? { id: "", name: "", avatar: "", intro: "" }}
        onSend={(method, note) => handleRespond("ACCEPTED", { responseNote: note })}
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
