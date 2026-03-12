"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  X, 
  MessageCircle, 
  Users, 
  BookOpen, 
  Sparkles, 
  Calendar, 
  MoreHorizontal,
  Check,
  Clock,
  Mail,
  Video,
  ExternalLink
} from "lucide-react"

// Types
interface Person {
  id: string
  name: string
  avatar: string
  intro: string
  floor?: string
  openToIntros?: boolean
}

type ReasonType = "feedback" | "collaboration" | "learning" | "shared-interest" | "event-follow-up" | "other"
type ConnectionMode = "async" | "chat-15" | "event" | "open"
type RequestStatus = "pending" | "accepted" | "not-now" | "passed" | "alternate-path"

interface IntroRequest {
  id: string
  from: Person
  to: Person
  reason: ReasonType
  message: string
  connectionMode: ConnectionMode
  link?: string
  status: RequestStatus
  response?: {
    method?: "email" | "chat" | "time" | "event"
    note?: string
    event?: string
    notNowReason?: string
    alternatePath?: string
    alternateNote?: string
  }
}

// Reason options
const REASONS: { value: ReasonType; label: string; icon: React.ElementType }[] = [
  { value: "feedback", label: "Feedback", icon: MessageCircle },
  { value: "collaboration", label: "Collaboration", icon: Users },
  { value: "learning", label: "Learning", icon: BookOpen },
  { value: "shared-interest", label: "Shared interest", icon: Sparkles },
  { value: "event-follow-up", label: "Event follow-up", icon: Calendar },
  { value: "other", label: "Other", icon: MoreHorizontal },
]

// Connection mode options
const CONNECTION_MODES: { value: ConnectionMode; label: string; description: string }[] = [
  { value: "async", label: "Quick async intro", description: "A brief message exchange" },
  { value: "chat-15", label: "15-minute chat", description: "A short video or phone call" },
  { value: "event", label: "Meet at an upcoming event", description: "Connect in person" },
  { value: "open", label: "Open to whatever works best", description: "Let them choose" },
]

// Accept connection methods
const ACCEPT_METHODS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "email", label: "Share email", icon: Mail },
  { value: "chat", label: "Open chat here", icon: MessageCircle },
  { value: "time", label: "Suggest a time", icon: Clock },
  { value: "event", label: "Meet at an event instead", icon: Calendar },
]

// Not now reasons
const NOT_NOW_REASONS = [
  "Busy right now",
  "Limited bandwidth for 1:1s",
  "Better after an upcoming event",
  "Not the right time",
]

// Alternate paths
const ALTERNATE_PATHS = [
  "Meet me at an upcoming event",
  "Send me a shorter async question",
  "Follow up in a couple of weeks",
  "Another option",
]

// ============================================
// REQUESTER FLOW
// ============================================

interface RequestIntroSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person
  onSend?: (request: Omit<IntroRequest, "id" | "from" | "status">) => void
}

export function RequestIntroSheet({ open, onOpenChange, person, onSend }: RequestIntroSheetProps) {
  const [step, setStep] = useState<"compose" | "review" | "sent">("compose")
  const [reason, setReason] = useState<ReasonType | null>(null)
  const [message, setMessage] = useState("")
  const [connectionMode, setConnectionMode] = useState<ConnectionMode | null>(null)
  const [link, setLink] = useState("")

  const isMessageTooShort = message.length > 0 && message.length < 50
  const isValid = reason && message.length >= 50 && connectionMode

  const handleClose = () => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(() => {
      setStep("compose")
      setReason(null)
      setMessage("")
      setConnectionMode(null)
      setLink("")
    }, 300)
  }

  const handleSend = () => {
    if (!reason || !connectionMode) return
    onSend?.({
      to: person,
      reason,
      message,
      connectionMode,
      link: link || undefined,
    })
    setStep("sent")
  }

  const getReasonLabel = (r: ReasonType) => REASONS.find(x => x.value === r)?.label || r
  const getConnectionLabel = (c: ConnectionMode) => CONNECTION_MODES.find(x => x.value === c)?.label || c

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[460px] p-0 flex flex-col"
      >
        {step === "compose" && (
          <>
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl font-serif">Request an intro</SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground mt-1">
                    Send a short, thoughtful note about why you'd like to connect.
                  </SheetDescription>
                </div>
                <Button variant="ghost" size="icon" className="size-8 -mt-1 -mr-2" onClick={handleClose}>
                  <X className="size-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Recipient preview */}
              <div className="bg-muted/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {person.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.intro}</p>
                    {person.openToIntros && (
                      <Badge variant="secondary" className="mt-2 text-xs bg-primary/10 text-primary border-0">
                        Open to relevant intros
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Reason selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Why are you reaching out?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => {
                    const Icon = r.icon
                    const isSelected = reason === r.value
                    return (
                      <button
                        key={r.value}
                        onClick={() => setReason(r.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all",
                          "border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50 text-foreground"
                        )}
                      >
                        <Icon className="size-3.5" />
                        {r.label}
                      </button>
                    )
                  })}
                </div>
                {!reason && (
                  <p className="text-xs text-muted-foreground">Choose a reason for reaching out.</p>
                )}
              </div>

              {/* Message field */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  What would you like them to know?
                </Label>
                <Textarea
                  placeholder="I'm building..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[140px] resize-none"
                />
                {isMessageTooShort && (
                  <p className="text-xs text-amber-600">
                    Try adding one sentence about why you'd like to connect with {person.name.split(" ")[0]} specifically.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  A few sentences is enough. Mention one concrete reason you're reaching out to this person.
                </p>
                {message.length > 200 && (
                  <p className="text-xs text-muted-foreground text-right">{message.length} characters</p>
                )}
              </div>

              {/* Connection mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  What kind of connection feels right?
                </Label>
                <RadioGroup
                  value={connectionMode || ""}
                  onValueChange={(v) => setConnectionMode(v as ConnectionMode)}
                  className="space-y-2"
                >
                  {CONNECTION_MODES.map((mode) => (
                    <div key={mode.value} className="flex items-start space-x-3">
                      <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
                      <Label htmlFor={mode.value} className="font-normal cursor-pointer">
                        <span className="text-foreground">{mode.label}</span>
                        <span className="block text-xs text-muted-foreground">{mode.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {!connectionMode && (
                  <p className="text-xs text-muted-foreground">
                    Choose the lightest connection style that feels right.
                  </p>
                )}
              </div>

              {/* Optional link */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">
                  Add a link (optional)
                </Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-border/50 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep("review")} disabled={!isValid}>
                Review request
              </Button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b border-border/50">
              <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" className="size-8 -ml-2" onClick={() => setStep("compose")}>
                  <ArrowLeft className="size-4" />
                </Button>
                <div>
                  <SheetTitle className="text-xl font-serif">Review your request</SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground mt-1">
                    Make sure this feels clear and specific.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* To */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">To</p>
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {person.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.intro}</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</p>
                <p className="text-foreground">{reason && getReasonLabel(reason)}</p>
              </div>

              {/* Preferred connection */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preferred connection</p>
                <p className="text-foreground">{connectionMode && getConnectionLabel(connectionMode)}</p>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your note</p>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-foreground whitespace-pre-wrap">{message}</p>
                </div>
              </div>

              {/* Link */}
              {link && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Link</p>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {link.replace(/^https?:\/\//, "").slice(0, 40)}...
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-border/50 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setStep("compose")}>Edit</Button>
              <Button onClick={handleSend}>Send request</Button>
            </div>
          </>
        )}

        {step === "sent" && (
          <>
            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Check className="size-8 text-primary" />
              </div>
              <h2 className="text-xl font-serif text-foreground mb-2">Request sent</h2>
              <p className="text-muted-foreground mb-8 max-w-[280px]">
                {person.name.split(" ")[0]} can accept, pass, or suggest a different way to connect.
              </p>

              <div className="w-full space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 text-left">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <p className="text-foreground flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    Pending
                  </p>
                </div>

                <p className="text-sm text-muted-foreground italic">
                  Thoughtful, specific requests usually work better than broad networking asks.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-border/50 flex items-center justify-end gap-3">
              <Button variant="ghost">View request</Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// RECIPIENT FLOW
// ============================================

interface IntroRequestCardProps {
  request: IntroRequest
  onAccept?: () => void
  onNotNow?: () => void
  onPass?: () => void
  onSuggestPath?: () => void
}

export function IntroRequestCard({ request, onAccept, onNotNow, onPass, onSuggestPath }: IntroRequestCardProps) {
  const getReasonLabel = (r: ReasonType) => {
    const labels: Record<ReasonType, string> = {
      "feedback": "Feedback on something they're building",
      "collaboration": "Potential collaboration",
      "learning": "Learning from your experience",
      "shared-interest": "Shared interest",
      "event-follow-up": "Following up from an event",
      "other": "Reaching out",
    }
    return labels[r]
  }

  const getConnectionLabel = (c: ConnectionMode) => CONNECTION_MODES.find(x => x.value === c)?.label || c

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-muted/20 border-b border-border/30">
        <p className="text-sm font-medium text-foreground">New intro request</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Requester info */}
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {request.from.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{request.from.name}</p>
            <p className="text-sm text-muted-foreground">{request.from.intro}</p>
            {request.from.floor && (
              <p className="text-xs text-muted-foreground mt-0.5">{request.from.floor}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wants to connect about</p>
          <p className="text-sm text-foreground">{getReasonLabel(request.reason)}</p>
        </div>

        {/* Connection preference */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preferred connection</p>
          <p className="text-sm text-foreground">{getConnectionLabel(request.connectionMode)}</p>
        </div>

        {/* Note */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</p>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{request.message}</p>
          </div>
        </div>

        {/* Link */}
        {request.link && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Link</p>
            <a href={request.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
              {request.link.replace(/^https?:\/\//, "").slice(0, 40)}
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={onAccept} className="flex-1">Accept</Button>
            <Button variant="secondary" onClick={onNotNow} className="flex-1">Not now</Button>
            <Button variant="outline" onClick={onSuggestPath} className="flex-1">
              Suggest another path
            </Button>
          </div>
          <button onClick={onPass} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center">
            Pass
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ACCEPT MODAL
// ============================================

interface AcceptIntroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person
  onSend?: (method: string, note?: string) => void
}

export function AcceptIntroModal({ open, onOpenChange, person, onSend }: AcceptIntroModalProps) {
  const [method, setMethod] = useState<string>("email")
  const [note, setNote] = useState("")

  const handleSend = () => {
    onSend?.(method, note || undefined)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-serif text-foreground">Choose how to connect</h2>
            <p className="text-sm text-muted-foreground mt-1">Pick the easiest next step.</p>
          </div>

          <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
            {ACCEPT_METHODS.map((m) => {
              const Icon = m.icon
              return (
                <div key={m.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={m.value} id={`accept-${m.value}`} />
                  <Label htmlFor={`accept-${m.value}`} className="font-normal cursor-pointer flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {m.label}
                  </Label>
                </div>
              )
            })}
          </RadioGroup>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Optional note</Label>
            <Textarea
              placeholder="Happy to connect — email is easiest."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Back</Button>
          <Button onClick={handleSend}>Send acceptance</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// NOT NOW MODAL
// ============================================

interface NotNowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend?: (reason?: string, note?: string) => void
}

export function NotNowModal({ open, onOpenChange, onSend }: NotNowModalProps) {
  const [reason, setReason] = useState<string>("")
  const [note, setNote] = useState("")

  const handleSend = () => {
    onSend?.(reason || undefined, note || undefined)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-serif text-foreground">Not available right now</h2>
            <p className="text-sm text-muted-foreground mt-1">Optional: let them know why.</p>
          </div>

          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {NOT_NOW_REASONS.map((r) => (
              <div key={r} className="flex items-center space-x-3">
                <RadioGroupItem value={r} id={`notnow-${r}`} />
                <Label htmlFor={`notnow-${r}`} className="font-normal cursor-pointer">
                  {r}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Optional note</Label>
            <Input
              placeholder="Add a personal note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend}>Send</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PASS MODAL
// ============================================

interface PassModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPass?: (note?: string) => void
}

export function PassModal({ open, onOpenChange, onPass }: PassModalProps) {
  const [note, setNote] = useState("")

  const handlePass = () => {
    onPass?.(note || undefined)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-serif text-foreground">Pass on this intro request?</h2>
            <p className="text-sm text-muted-foreground mt-1">They'll be notified that this wasn't a fit.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Optional note</Label>
            <Textarea
              placeholder="Appreciate the thoughtful note, but this isn't the best fit for me right now."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handlePass}>Pass</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SUGGEST ANOTHER PATH MODAL
// ============================================

interface SuggestPathModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend?: (path: string, note?: string, event?: string) => void
}

export function SuggestPathModal({ open, onOpenChange, onSend }: SuggestPathModalProps) {
  const [path, setPath] = useState<string>("")
  const [note, setNote] = useState("")
  const [event, setEvent] = useState("")

  const handleSend = () => {
    if (!path) return
    onSend?.(path, note || undefined, event || undefined)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-serif text-foreground">Suggest another way to connect</h2>
            <p className="text-sm text-muted-foreground mt-1">Offer a lighter path if a direct intro isn't the best fit right now.</p>
          </div>

          <RadioGroup value={path} onValueChange={setPath} className="space-y-2">
            {ALTERNATE_PATHS.map((p) => (
              <div key={p} className="flex items-center space-x-3">
                <RadioGroupItem value={p} id={`path-${p}`} />
                <Label htmlFor={`path-${p}`} className="font-normal cursor-pointer">
                  {p}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Optional note</Label>
            <Textarea
              placeholder="Happy to connect, but an event or async note would be easier than a 1:1 right now."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {path === "Meet me at an upcoming event" && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Optional link / event</Label>
              <Input
                placeholder="Thursday salon event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Back</Button>
          <Button onClick={handleSend} disabled={!path}>Send suggestion</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// REQUESTER RESPONSE CARDS
// ============================================

interface ResponseCardProps {
  request: IntroRequest
  onDone?: () => void
}

export function AcceptedResponseCard({ request, onDone }: ResponseCardProps) {
  const methodLabels: Record<string, string> = {
    email: "Share email",
    chat: "Open chat here",
    time: "Suggest a time",
    event: "Meet at an event",
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="size-4 text-green-600" />
        </div>
        <h3 className="font-medium text-foreground">{request.to.name} accepted your intro request</h3>
      </div>

      {request.response?.method && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connection method</p>
          <p className="text-sm text-foreground">{methodLabels[request.response.method]}</p>
        </div>
      )}

      {request.response?.note && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</p>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-sm text-foreground">{request.response.note}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" size="sm">View details</Button>
        <Button size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

export function NotNowResponseCard({ request, onDone }: ResponseCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-medium text-foreground">Not available right now</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {request.to.name} isn't taking new intro requests at the moment.
        </p>
      </div>

      {request.response?.notNowReason && (
        <div className="bg-muted/30 rounded-xl p-3">
          <p className="text-sm text-muted-foreground">{request.response.notNowReason}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" size="sm">Browse other people</Button>
        <Button size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

export function PassedResponseCard({ request, onDone }: ResponseCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-medium text-foreground">This intro wasn't a fit</h3>
        <p className="text-sm text-muted-foreground mt-1">
          That happens. Here are a few other people or events that may be relevant.
        </p>
      </div>

      {/* Placeholder suggestions */}
      <div className="space-y-2">
        <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">SC</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Similar person</p>
            <p className="text-xs text-muted-foreground">Working on related projects</p>
          </div>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
          <Calendar className="size-8 text-muted-foreground p-1.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Upcoming event</p>
            <p className="text-xs text-muted-foreground">Good place to meet people</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" size="sm">See suggestions</Button>
        <Button size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

export function AlternatePathResponseCard({ request, onDone }: ResponseCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-medium text-foreground">They suggested another way to connect</h3>
      </div>

      {request.response?.alternatePath && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested path</p>
          <p className="text-sm text-foreground">{request.response.alternatePath}</p>
        </div>
      )}

      {request.response?.alternateNote && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</p>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-sm text-foreground">{request.response.alternateNote}</p>
          </div>
        </div>
      )}

      {request.response?.event && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</p>
          <p className="text-sm text-primary">{request.response.event}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {request.response?.event && (
          <Button variant="ghost" size="sm">View event</Button>
        )}
        <Button size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

// ============================================
// DEMO WRAPPER - Shows full flow
// ============================================

interface RequestIntroDemoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person
}

export function RequestIntroDemo({ open, onOpenChange, person }: RequestIntroDemoProps) {
  return (
    <RequestIntroSheet
      open={open}
      onOpenChange={onOpenChange}
      person={person}
      onSend={(request) => {
        console.log("Request sent:", request)
      }}
    />
  )
}
