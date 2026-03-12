"use client"

import { useState } from "react"
import { 
  IntroRequestCard, 
  AcceptIntroModal, 
  NotNowModal, 
  PassModal, 
  SuggestPathModal,
  AcceptedResponseCard,
  NotNowResponseCard,
  PassedResponseCard,
  AlternatePathResponseCard
} from "@/components/request-intro-flow"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell } from "lucide-react"
import Link from "next/link"

// Demo data
const demoRequest = {
  id: "req-1",
  from: {
    id: "wenjie",
    name: "Wenjie Fu",
    avatar: "WF",
    intro: "Building agentic tools for visual software",
    floor: "Floor 9",
    openToIntros: true,
  },
  to: {
    id: "maya",
    name: "Maya Chen",
    avatar: "MC",
    intro: "Designing consumer AI interfaces",
    openToIntros: true,
  },
  reason: "feedback" as const,
  message: "I'm building a visual layer for AI tools that lets non-technical users compose workflows. I saw your demo at the AI circle last week and really liked how you approached the interaction patterns. Would love to get your feedback on our current prototype, especially around how we're handling the canvas-based interface for connecting different agents.",
  connectionMode: "chat-15" as const,
  link: "https://wenjiefu.com/demo",
  status: "pending" as const,
}

export default function InboxPage() {
  const [activeModal, setActiveModal] = useState<"accept" | "not-now" | "pass" | "suggest-path" | null>(null)
  const [responseState, setResponseState] = useState<"pending" | "accepted" | "not-now" | "passed" | "alternate-path">("pending")
  const [responseData, setResponseData] = useState<{
    method?: string
    note?: string
    notNowReason?: string
    alternatePath?: string
    alternateNote?: string
    event?: string
  }>({})

  const handleAccept = (method: string, note?: string) => {
    setResponseData({ method, note })
    setResponseState("accepted")
    setActiveModal(null)
  }

  const handleNotNow = (reason?: string, note?: string) => {
    setResponseData({ notNowReason: reason || note })
    setResponseState("not-now")
    setActiveModal(null)
  }

  const handlePass = (note?: string) => {
    setResponseData({ note })
    setResponseState("passed")
    setActiveModal(null)
  }

  const handleSuggestPath = (path: string, note?: string, event?: string) => {
    setResponseData({ alternatePath: path, alternateNote: note, event })
    setResponseState("alternate-path")
    setActiveModal(null)
  }

  const resetDemo = () => {
    setResponseState("pending")
    setResponseData({})
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
          <Bell className="size-5 text-muted-foreground" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {responseState === "pending" ? "New Requests" : "Response Sent"}
            </h2>
            {responseState !== "pending" && (
              <Button variant="ghost" size="sm" onClick={resetDemo}>
                Reset demo
              </Button>
            )}
          </div>

          {/* Request card or response card */}
          {responseState === "pending" && (
            <IntroRequestCard
              request={demoRequest}
              onAccept={() => setActiveModal("accept")}
              onNotNow={() => setActiveModal("not-now")}
              onPass={() => setActiveModal("pass")}
              onSuggestPath={() => setActiveModal("suggest-path")}
            />
          )}

          {responseState === "accepted" && (
            <AcceptedResponseCard
              request={{
                ...demoRequest,
                status: "accepted",
                response: {
                  method: responseData.method as "email" | "chat" | "time" | "event",
                  note: responseData.note,
                },
              }}
              onDone={resetDemo}
            />
          )}

          {responseState === "not-now" && (
            <NotNowResponseCard
              request={{
                ...demoRequest,
                status: "not-now",
                response: {
                  notNowReason: responseData.notNowReason,
                },
              }}
              onDone={resetDemo}
            />
          )}

          {responseState === "passed" && (
            <PassedResponseCard
              request={{
                ...demoRequest,
                status: "passed",
              }}
              onDone={resetDemo}
            />
          )}

          {responseState === "alternate-path" && (
            <AlternatePathResponseCard
              request={{
                ...demoRequest,
                status: "alternate-path",
                response: {
                  alternatePath: responseData.alternatePath,
                  alternateNote: responseData.alternateNote,
                  event: responseData.event,
                },
              }}
              onDone={resetDemo}
            />
          )}

          {/* Demo info */}
          <div className="bg-muted/30 rounded-xl p-4 mt-8">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Demo:</strong> This page shows the recipient flow for intro requests. 
              Click the action buttons to see the different response modals and outcome states.
            </p>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AcceptIntroModal
        open={activeModal === "accept"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        person={demoRequest.from}
        onSend={handleAccept}
      />

      <NotNowModal
        open={activeModal === "not-now"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSend={handleNotNow}
      />

      <PassModal
        open={activeModal === "pass"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onPass={handlePass}
      />

      <SuggestPathModal
        open={activeModal === "suggest-path"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSend={handleSuggestPath}
      />
    </div>
  )
}
