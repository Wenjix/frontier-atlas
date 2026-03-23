"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { visibilityMap, opennessMap } from "@/lib/enum-maps"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, Upload, X, Check, Users } from "lucide-react"

// Form data types
interface OnboardingData {
  fullName: string
  photo: string | null
  oneLineIntro: string
  website: string
  workingOn: string
  curiousAbout: string
  topics: string[]
  whoToMeet: string
  helpOthers: string
  needHelp: string
  conversationStarter: string
  visibility: "floor" | "tower" | "leads"
  openness: "very" | "relevant" | "low"
}

interface SuggestedPerson {
  id: string
  fullName: string
  avatarUrl: string | null
  oneLineIntro: string
}

const SUGGESTED_TOPICS = [
  "AI", "Robotics", "Biotech", "Health", "Longevity", "Arts", "Music",
  "Makers", "Crypto", "Design", "Community", "Fundraising", "Hardware",
  "Events", "Human Flourishing"
]

// Building metaphor for progress
const STEP_LABELS = [
  "", // 0: entry
  "Laying the foundation", // 1: basics
  "Building your floor", // 2a: working on
  "Adding windows", // 2b: curious about
  "Choosing your topics", // 2c: topics
  "Opening doors", // 3a: who to meet
  "Offering a hand", // 3b: help others
  "Raising a flag", // 3c: need help
  "The welcome mat", // 3d: conversation starter
  "Setting the lights", // 4: visibility
  "Final walkthrough", // 5: preview
]

const TOTAL_CONTENT_STEPS = 10 // Steps 1-10 (excluding entry and completion)

interface OnboardingFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorName?: string
  initialData?: Partial<OnboardingData> | null
  walletAddress?: string | null
}

export function OnboardingFlow({ open, onOpenChange, floorName = "AI", initialData, walletAddress }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    photo: null,
    oneLineIntro: "",
    website: "",
    workingOn: "",
    curiousAbout: "",
    topics: [],
    whoToMeet: "",
    helpOthers: "",
    needHelp: "",
    conversationStarter: "",
    visibility: "floor",
    openness: "very",
  })
  const [customTopic, setCustomTopic] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [completionPeople, setCompletionPeople] = useState<SuggestedPerson[]>([])

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  useEffect(() => {
    if (open && initialData) {
      setData(prev => ({ ...prev, ...initialData }))
      setStep(1) // Skip the entry step, go straight to editing
    }
  }, [open, initialData])

  // ENS profile pre-fill for wallet users (best-effort)
  useEffect(() => {
    if (open && walletAddress && !initialData) {
      fetch(`/api/ens/${walletAddress}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            const ens = result.data
            setData(prev => ({
              ...prev,
              fullName: prev.fullName || ens.name || "",
              oneLineIntro: prev.oneLineIntro || ens.description || "",
              website: prev.website || ens.url || "",
            }))
          }
        })
        .catch(() => {
          // Silently fail — ENS pre-fill is best-effort
        })
    }
  }, [open, walletAddress, initialData])

  const toggleTopic = (topic: string) => {
    setData(prev => {
      if (prev.topics.includes(topic)) {
        return { ...prev, topics: prev.topics.filter(t => t !== topic) }
      }
      if (prev.topics.length >= 5) return prev
      return { ...prev, topics: [...prev.topics, topic] }
    })
  }

  const addCustomTopic = () => {
    if (customTopic.trim() && data.topics.length < 5) {
      toggleTopic(customTopic.trim())
      setCustomTopic("")
    }
  }

  const canContinue = () => {
    switch (step) {
      case 1: return data.fullName.trim().length > 0 && data.oneLineIntro.trim().length > 0
      case 2: return data.workingOn.trim().length > 0
      case 3: return data.curiousAbout.trim().length > 0
      case 4: return data.topics.length > 0
      case 5: return data.whoToMeet.trim().length > 0
      case 6: return data.helpOthers.trim().length > 0
      case 7: return data.needHelp.trim().length > 0
      case 8: return true // conversation starter is optional
      case 9: return true // visibility always valid
      default: return true
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => setStep(0), 300)
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await api.put("/api/me/profile/draft", {
        fullName: data.fullName,
        oneLineIntro: data.oneLineIntro,
        websiteUrl: data.website || null,
        workingOn: data.workingOn,
        curiousAbout: data.curiousAbout,
        wantsToMeet: data.whoToMeet,
        canHelpWith: data.helpOthers,
        needsHelpWith: data.needHelp,
        conversationStarter: data.conversationStarter || null,
        visibility: visibilityMap[data.visibility],
        introOpenness: opennessMap[data.openness],
        topics: data.topics,
      })
      await api.post("/api/me/profile/publish")
      // Fetch suggested people for completion
      api.get<{ people: SuggestedPerson[] }>("/api/me/suggested-people?limit=3")
        .then(res => setCompletionPeople(res.people))
        .catch(() => {})
      setStep(11) // completion
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish profile")
    } finally {
      setPublishing(false)
    }
  }

  const progressPercent = step >= 1 && step <= 10 ? (step / TOTAL_CONTENT_STEPS) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Profile Setup</DialogTitle>
        <DialogDescription className="sr-only">
          Set up your profile to help floor leads make better introductions and help the right people find you.
        </DialogDescription>

        {/* Step 0: Entry */}
        {step === 0 && (
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="font-serif text-2xl text-foreground mb-4">
                Welcome to Floor {floorName}
              </h2>
              <p className="text-muted-foreground mb-2">
                You're in. Take 2-3 minutes to tell the floor a bit about what you're working on,
                what you're curious about, and how you'd like to connect.
              </p>
              <p className="text-sm text-muted-foreground/70 mb-8">
                This helps floor leads make better introductions and helps the right people find you.
              </p>
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={() => setStep(1)} className="w-full">
                  Set up my profile
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Steps 1-10: Form Steps */}
        {step >= 1 && step <= 10 && (
          <div className="flex flex-col">
            {/* Progress Header with building metaphor */}
            <div className="px-8 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {STEP_LABELS[step] || `Step ${step}`}
                </span>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">Start with the basics</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Give the floor a quick sense of who you are.
                </p>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your name"
                      value={data.fullName}
                      onChange={(e) => updateData({ fullName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Profile photo</Label>
                    <p className="text-xs text-muted-foreground">
                      A photo makes it easier for people to recognize you around the tower.
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Avatar className="size-16">
                        <AvatarImage src={data.photo ?? undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {data.fullName.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" size="sm" disabled title="Photo upload coming soon">
                        <Upload className="size-4 mr-2" />
                        Upload photo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oneLineIntro">One-line intro</Label>
                    <p className="text-xs text-muted-foreground">
                      How would you describe yourself in one line?
                    </p>
                    <Input
                      id="oneLineIntro"
                      placeholder="AI founder building agent tooling for developer workflows"
                      value={data.oneLineIntro}
                      onChange={(e) => updateData({ oneLineIntro: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground/70">Keep it short and specific.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">
                      Website or project link
                      <span className="text-muted-foreground/60 font-normal ml-1">optional</span>
                    </Label>
                    <Input
                      id="website"
                      placeholder="https://"
                      value={data.website}
                      onChange={(e) => updateData({ website: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Working on (single question) */}
            {step === 2 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  What are you working on right now?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  This is the part people will care about most. A few sentences is enough.
                </p>

                <div className="space-y-4">
                  <Textarea
                    id="workingOn"
                    placeholder="Tell people what you're actually building, exploring, or spending time on..."
                    value={data.workingOn}
                    onChange={(e) => updateData({ workingOn: e.target.value })}
                    rows={5}
                    className="text-[15px]"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Curious about (single question) */}
            {step === 3 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  What are you curious about right now?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  What topics, questions, or rabbit holes are on your mind these days?
                </p>

                <div className="space-y-4">
                  <Textarea
                    id="curiousAbout"
                    placeholder="The questions you keep coming back to, or topics you'd love to explore with others..."
                    value={data.curiousAbout}
                    onChange={(e) => updateData({ curiousAbout: e.target.value })}
                    rows={4}
                    className="text-[15px]"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Topics */}
            {step === 4 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  What topics are you into?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose up to 5 — these help match you with the right people.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TOPICS.map(topic => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-full border transition-colors",
                          data.topics.includes(topic)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                        )}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add another topic"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTopic()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addCustomTopic} disabled={data.topics.length >= 5}>
                      Add
                    </Button>
                  </div>

                  {data.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground">Selected:</span>
                      {data.topics.map(topic => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                          <button onClick={() => toggleTopic(topic)} className="ml-1 hover:text-destructive">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {data.topics.length >= 5 && (
                    <p className="text-xs text-muted-foreground">Maximum 5 topics selected.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Who to meet */}
            {step === 5 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  Who would you love to meet here?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Be as practical or specific as you want. This helps floor leads make intros.
                </p>

                <div className="space-y-4">
                  <Textarea
                    id="whoToMeet"
                    placeholder="The kinds of people, roles, or backgrounds you'd love to connect with..."
                    value={data.whoToMeet}
                    onChange={(e) => updateData({ whoToMeet: e.target.value })}
                    rows={4}
                    className="text-[15px]"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Help others */}
            {step === 6 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  What are you happy to help with?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  What do people tend to come to you for? This surfaces you for the right intros.
                </p>

                <div className="space-y-4">
                  <Textarea
                    id="helpOthers"
                    placeholder="Your areas of expertise, things you enjoy helping with..."
                    value={data.helpOthers}
                    onChange={(e) => updateData({ helpOthers: e.target.value })}
                    rows={4}
                    className="text-[15px]"
                  />
                </div>
              </div>
            )}

            {/* Step 7: Need help */}
            {step === 7 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  What would be useful help for you right now?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  This can be technical, social, creative, or practical. Be specific.
                </p>

                <div className="space-y-4">
                  <Textarea
                    id="needHelp"
                    placeholder="The things you're stuck on, looking for, or would love to find..."
                    value={data.needHelp}
                    onChange={(e) => updateData({ needHelp: e.target.value })}
                    rows={4}
                    className="text-[15px]"
                  />
                </div>
              </div>
            )}

            {/* Step 8: Conversation starter */}
            {step === 8 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  Got a good conversation starter?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  A small detail can make introductions much easier. This is optional.
                </p>

                <div className="space-y-4">
                  <Input
                    id="conversationStarter"
                    placeholder="Ask me about board games, weird interfaces, or the future of social spaces."
                    value={data.conversationStarter}
                    onChange={(e) => updateData({ conversationStarter: e.target.value })}
                    className="text-[15px]"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    Something light that makes it easy for someone to break the ice.
                  </p>
                </div>
              </div>
            )}

            {/* Step 9: Visibility */}
            {step === 9 && (
              <div className="p-8 animate-fade-slide-in">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  Choose how visible you want to be
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  You can keep this lightweight and change it later.
                </p>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label>Who can see your profile?</Label>
                    <RadioGroup
                      value={data.visibility}
                      onValueChange={(v) => updateData({ visibility: v as OnboardingData["visibility"] })}
                      className="space-y-2"
                    >
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="floor" id="vis-floor" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">My floor only</div>
                          <div className="text-xs text-muted-foreground">Visible to members and leads on this floor</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="tower" id="vis-tower" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Across the tower</div>
                          <div className="text-xs text-muted-foreground">Visible to members across Frontier</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="leads" id="vis-leads" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Floor leads only for now</div>
                          <div className="text-xs text-muted-foreground">Visible to leads until you're ready</div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>How open are you to meeting new people right now?</Label>
                    <RadioGroup
                      value={data.openness}
                      onValueChange={(v) => updateData({ openness: v as OnboardingData["openness"] })}
                      className="space-y-2"
                    >
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="very" id="open-very" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Very open</div>
                          <div className="text-xs text-muted-foreground">I'm happy to meet new people</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="relevant" id="open-relevant" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Open if relevant</div>
                          <div className="text-xs text-muted-foreground">Best when there's a clear fit</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="low" id="open-low" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Keeping a low profile for now</div>
                          <div className="text-xs text-muted-foreground">I'd prefer to stay quieter</div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}

            {/* Step 10: Preview */}
            {step === 10 && (
              <div className="p-8 animate-fade-slide-in">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl text-foreground mb-1">
                      Here's how your profile will look
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      You can edit anything before publishing.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Preview Card */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-border/50 bg-muted/20">
                    <div className="flex items-start gap-4">
                      <Avatar className="size-16">
                        <AvatarImage src={data.photo ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {data.fullName.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg">{data.fullName || "Your Name"}</h3>
                        <p className="text-muted-foreground text-sm mt-0.5">
                          {data.oneLineIntro || "Your one-line intro"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    {data.workingOn && <PreviewSection title="Working on" content={data.workingOn} />}
                    {data.curiousAbout && <PreviewSection title="Curious about" content={data.curiousAbout} />}
                    {data.whoToMeet && <PreviewSection title="Looking to meet" content={data.whoToMeet} />}
                    {data.helpOthers && <PreviewSection title="Happy to help with" content={data.helpOthers} />}
                    {data.needHelp && <PreviewSection title="Would love help with" content={data.needHelp} />}

                    {data.topics.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Topics
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {data.topics.map(topic => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border/50 flex gap-6 text-xs">
                      <div>
                        <span className="text-muted-foreground">Visibility: </span>
                        <span className="capitalize">
                          {data.visibility === "floor" ? "My floor" : data.visibility === "tower" ? "Tower-wide" : "Leads only"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Openness: </span>
                        <span className="capitalize">
                          {data.openness === "very" ? "Very open" : data.openness === "relevant" ? "Open if relevant" : "Low profile"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="px-8 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
              <Button
                variant="ghost"
                onClick={() => setStep(prev => prev - 1)}
                className="text-muted-foreground"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              {step < 9 && (
                <Button onClick={() => setStep(prev => prev + 1)} disabled={!canContinue()}>
                  Continue
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              )}
              {step === 9 && (
                <Button onClick={() => setStep(10)}>
                  Preview profile
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              )}
              {step === 10 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Edit answers
                  </Button>
                  <Button onClick={handlePublish} disabled={publishing}>
                    <Check className="size-4 mr-2" />
                    {publishing ? "Publishing..." : "Publish profile"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 11: Completion with suggested people */}
        {step === 11 && (
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="size-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-6 animate-celebrate-pulse">
                <Check className="size-8 text-accent" />
              </div>
              <h2 className="font-serif text-2xl text-foreground mb-3 animate-warm-slide-up">
                You're visible on Floor {floorName}!
              </h2>
              <p className="text-muted-foreground mb-6 animate-warm-slide-up" style={{ animationDelay: "0.1s" }}>
                The floor can now see what you're working on and how to connect with you.
              </p>

              {/* Suggested people to meet */}
              {completionPeople.length > 0 && (
                <div className="text-left mb-6 animate-warm-slide-up" style={{ animationDelay: "0.2s" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="size-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">People you might want to meet</p>
                  </div>
                  <div className="space-y-2">
                    {completionPeople.map((person) => (
                      <div
                        key={person.id}
                        className="bg-muted/30 rounded-xl p-3 flex items-center gap-3"
                      >
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {person.fullName.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-foreground">{person.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{person.oneLineIntro}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 animate-warm-slide-up" style={{ animationDelay: "0.3s" }}>
                <Button size="lg" onClick={handleClose} className="w-full">
                  See people to know
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PreviewSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        {title}
      </h4>
      <p className="text-sm">{content}</p>
    </div>
  )
}
