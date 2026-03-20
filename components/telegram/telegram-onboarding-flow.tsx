"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { telegramApi } from "@/lib/telegram/telegram-api-client"
import { useTelegram } from "@/lib/telegram/telegram-context"
import { visibilityMap, opennessMap, visibilityReverseMap, opennessReverseMap } from "@/lib/enum-maps"
import { TelegramJoinCard } from "./telegram-join-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, ArrowRight, Upload, X, Check } from "lucide-react"

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

const SUGGESTED_TOPICS = [
  "AI", "Robotics", "Biotech", "Health", "Longevity", "Arts", "Music",
  "Makers", "Crypto", "Design", "Community", "Fundraising", "Hardware",
  "Events", "Human Flourishing",
]

const STEP_LABELS = [
  "",
  "Laying the foundation",
  "Building your floor",
  "Adding windows",
  "Choosing your topics",
  "Opening doors",
  "Offering a hand",
  "Raising a flag",
  "The welcome mat",
  "Setting the lights",
  "Final walkthrough",
]

const TOTAL_CONTENT_STEPS = 10

const STORAGE_KEY = "tg-onboarding-draft"

const DEFAULT_DATA: OnboardingData = {
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
}

function loadDraft(): { step: number; data: OnboardingData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { step: 0, data: DEFAULT_DATA }
    const parsed = JSON.parse(raw)
    return {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      data: { ...DEFAULT_DATA, ...parsed.data },
    }
  } catch {
    return { step: 0, data: DEFAULT_DATA }
  }
}

function saveDraft(step: number, data: OnboardingData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }))
  } catch {
    // Storage full or unavailable — non-critical
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-critical
  }
}

interface TelegramOnboardingFlowProps {
  floorId?: string | null
}

export function TelegramOnboardingFlow({ floorId }: TelegramOnboardingFlowProps) {
  const router = useRouter()
  const { user } = useTelegram()
  const [initialized, setInitialized] = useState(false)
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA)
  const [customTopic, setCustomTopic] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [showPostPublishJoin, setShowPostPublishJoin] = useState(false)

  // Restore draft from localStorage on mount
  useEffect(() => {
    const draft = loadDraft()
    // Only restore if the user had gotten past the entry step
    if (draft.step >= 1 && draft.step <= 10) {
      setStep(draft.step)
      setData(draft.data)
    }
    setInitialized(true)
  }, [])

  // Fetch existing profile from API to pre-fill form (e.g., profile created on web)
  useEffect(() => {
    if (!initialized) return
    // Only fetch if we didn't restore a localStorage draft (i.e., starting fresh)
    if (step !== 0) return

    telegramApi
      .get<{
        fullName: string
        profile: {
          oneLineIntro: string | null
          websiteUrl: string | null
          workingOn: string | null
          curiousAbout: string | null
          wantsToMeet: string | null
          canHelpWith: string | null
          needsHelpWith: string | null
          conversationStarter: string | null
          visibility: string
          introOpenness: string
          topics: string[]
        } | null
      }>("/api/me/profile")
      .then((res) => {
        if (res.profile && res.profile.oneLineIntro) {
          // Profile exists with data - pre-fill the form
          setData({
            fullName: res.fullName || "",
            photo: null,
            oneLineIntro: res.profile.oneLineIntro || "",
            website: res.profile.websiteUrl || "",
            workingOn: res.profile.workingOn || "",
            curiousAbout: res.profile.curiousAbout || "",
            topics: res.profile.topics || [],
            whoToMeet: res.profile.wantsToMeet || "",
            helpOthers: res.profile.canHelpWith || "",
            needHelp: res.profile.needsHelpWith || "",
            conversationStarter: res.profile.conversationStarter || "",
            visibility: (visibilityReverseMap[res.profile.visibility as keyof typeof visibilityReverseMap] || "floor") as OnboardingData["visibility"],
            openness: (opennessReverseMap[res.profile.introOpenness as keyof typeof opennessReverseMap] || "very") as OnboardingData["openness"],
          })
        }
      })
      .catch(() => {
        // Non-critical: fall through to blank form
      })
  }, [initialized, step])

  // Persist draft to localStorage whenever step or data changes
  useEffect(() => {
    if (!initialized) return
    if (step >= 1 && step <= 10) {
      saveDraft(step, data)
    }
  }, [step, data, initialized])

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const toggleTopic = (topic: string) => {
    setData((prev) => {
      if (prev.topics.includes(topic)) {
        return { ...prev, topics: prev.topics.filter((t) => t !== topic) }
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
      case 8: return true
      case 9: return true
      default: return true
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await telegramApi.put("/api/me/profile/draft", {
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
      await telegramApi.post("/api/me/profile/publish")
      clearDraft()

      // Check if we should show the soft join reminder
      const joinStatus = user?.telegramJoinStatus
      if (joinStatus !== "CLICKED" && joinStatus !== "DISMISSED") {
        setShowPostPublishJoin(true)
        setStep(11) // completion with join prompt
      } else {
        setStep(11) // completion without join prompt
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish profile")
    } finally {
      setPublishing(false)
    }
  }

  const handleFinish = () => {
    if (floorId) {
      router.push(`/tg/floors/${floorId}`)
    } else {
      router.push("/tg")
    }
  }

  const progressPercent = step >= 1 && step <= 10 ? (step / TOTAL_CONTENT_STEPS) * 100 : 0

  // Step 0: Entry
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="font-serif text-2xl mb-4">Welcome to Atlas</h1>
          <p className="text-muted-foreground mb-2">
            Take 2-3 minutes to tell the floor a bit about what you&apos;re working on,
            what you&apos;re curious about, and how you&apos;d like to connect.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-8">
            This helps floor leads make better introductions and helps the right people find you.
          </p>
          <Button size="lg" onClick={() => setStep(1)} className="w-full">
            Set up my profile
          </Button>
        </div>
      </div>
    )
  }

  // Step 11: Completion
  if (step === 11) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-6">
          <div className="mx-auto size-12 rounded-full bg-accent/15 flex items-center justify-center">
            <Check className="size-6 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-serif mb-2">You&apos;re live</h2>
            <p className="text-sm text-muted-foreground">
              Your profile is now visible to your floor. Time to explore.
            </p>
          </div>

          {showPostPublishJoin && (
            <div className="text-left">
              <TelegramJoinCard />
            </div>
          )}

          <Button className="w-full" onClick={handleFinish}>
            {floorId ? "Go to your floor" : "Continue"}
          </Button>
        </div>
      </div>
    )
  }

  // Steps 1-10: Form Steps
  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-6 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {STEP_LABELS[step] || `Step ${step}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {step}/{TOTAL_CONTENT_STEPS}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl mb-1">Start with the basics</h2>
              <p className="text-sm text-muted-foreground">Give the floor a quick sense of who you are.</p>
            </div>
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
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={data.photo ?? undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {data.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Upload className="size-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oneLineIntro">One-line intro</Label>
              <Input
                id="oneLineIntro"
                placeholder="AI founder building agent tooling for developer workflows"
                value={data.oneLineIntro}
                onChange={(e) => updateData({ oneLineIntro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">
                Website <span className="text-muted-foreground/60 font-normal">optional</span>
              </Label>
              <Input
                id="website"
                placeholder="https://"
                value={data.website}
                onChange={(e) => updateData({ website: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">What are you working on right now?</h2>
              <p className="text-sm text-muted-foreground">A few sentences is enough.</p>
            </div>
            <Textarea
              placeholder="Tell people what you're building, exploring, or spending time on..."
              value={data.workingOn}
              onChange={(e) => updateData({ workingOn: e.target.value })}
              rows={5}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">What are you curious about?</h2>
              <p className="text-sm text-muted-foreground">Topics, questions, or rabbit holes on your mind.</p>
            </div>
            <Textarea
              placeholder="The questions you keep coming back to..."
              value={data.curiousAbout}
              onChange={(e) => updateData({ curiousAbout: e.target.value })}
              rows={4}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">Choose your topics</h2>
              <p className="text-sm text-muted-foreground">Pick up to 5 topics that represent your interests.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map((topic) => (
                <Badge
                  key={topic}
                  variant={data.topics.includes(topic) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleTopic(topic)}
                >
                  {data.topics.includes(topic) && <Check className="size-3 mr-1" />}
                  {topic}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add your own topic"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTopic())}
              />
              <Button variant="outline" size="sm" onClick={addCustomTopic} disabled={!customTopic.trim() || data.topics.length >= 5}>
                Add
              </Button>
            </div>
            {data.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.topics.filter((t) => !SUGGESTED_TOPICS.includes(t)).map((topic) => (
                  <Badge key={topic} variant="default" className="cursor-pointer" onClick={() => toggleTopic(topic)}>
                    {topic} <X className="size-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">Who would you like to meet?</h2>
              <p className="text-sm text-muted-foreground">Types of people, roles, or expertise you&apos;d value connecting with.</p>
            </div>
            <Textarea
              placeholder="Designers who've shipped AI-native products, founders building developer tools..."
              value={data.whoToMeet}
              onChange={(e) => updateData({ whoToMeet: e.target.value })}
              rows={4}
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">How can you help others?</h2>
              <p className="text-sm text-muted-foreground">What expertise, connections, or perspectives can you offer?</p>
            </div>
            <Textarea
              placeholder="Product strategy, agent system design, pitch deck reviews..."
              value={data.helpOthers}
              onChange={(e) => updateData({ helpOthers: e.target.value })}
              rows={4}
            />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">What do you need help with?</h2>
              <p className="text-sm text-muted-foreground">What are you stuck on or looking for right now?</p>
            </div>
            <Textarea
              placeholder="Finding early adopters, pricing strategy, design system architecture..."
              value={data.needHelp}
              onChange={(e) => updateData({ needHelp: e.target.value })}
              rows={4}
            />
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl mb-1">Conversation starter</h2>
              <p className="text-sm text-muted-foreground">
                Something to break the ice. What&apos;s a question or topic you always enjoy talking about?
                <span className="text-muted-foreground/60 ml-1">Optional</span>
              </p>
            </div>
            <Textarea
              placeholder="Ask me about the weirdest bug I've ever shipped to production..."
              value={data.conversationStarter}
              onChange={(e) => updateData({ conversationStarter: e.target.value })}
              rows={3}
            />
          </div>
        )}

        {step === 9 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl mb-1">Set your visibility</h2>
              <p className="text-sm text-muted-foreground">Choose who can see your profile.</p>
            </div>
            <div className="space-y-4">
              <Label className="text-sm font-medium">Profile visibility</Label>
              <RadioGroup value={data.visibility} onValueChange={(v) => updateData({ visibility: v as OnboardingData["visibility"] })}>
                <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => updateData({ visibility: "floor" })}>
                  <RadioGroupItem value="floor" id="v-floor" className="mt-0.5" />
                  <div>
                    <Label htmlFor="v-floor" className="cursor-pointer font-medium">Floor only</Label>
                    <p className="text-xs text-muted-foreground">Only members on your floor can see your profile.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => updateData({ visibility: "tower" })}>
                  <RadioGroupItem value="tower" id="v-tower" className="mt-0.5" />
                  <div>
                    <Label htmlFor="v-tower" className="cursor-pointer font-medium">Whole tower</Label>
                    <p className="text-xs text-muted-foreground">Anyone in the building can find you.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => updateData({ visibility: "leads" })}>
                  <RadioGroupItem value="leads" id="v-leads" className="mt-0.5" />
                  <div>
                    <Label htmlFor="v-leads" className="cursor-pointer font-medium">Leads only</Label>
                    <p className="text-xs text-muted-foreground">Only floor leads can see your full profile.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-4">
              <Label className="text-sm font-medium">Openness to intros</Label>
              <RadioGroup value={data.openness} onValueChange={(v) => updateData({ openness: v as OnboardingData["openness"] })}>
                <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => updateData({ openness: "very" })}>
                  <RadioGroupItem value="very" id="o-very" className="mt-0.5" />
                  <div>
                    <Label htmlFor="o-very" className="cursor-pointer font-medium">Very open</Label>
                    <p className="text-xs text-muted-foreground">Happy to hear from anyone.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => updateData({ openness: "relevant" })}>
                  <RadioGroupItem value="relevant" id="o-relevant" className="mt-0.5" />
                  <div>
                    <Label htmlFor="o-relevant" className="cursor-pointer font-medium">Open if relevant</Label>
                    <p className="text-xs text-muted-foreground">Prefer intros with clear shared interest.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => updateData({ openness: "low" })}>
                  <RadioGroupItem value="low" id="o-low" className="mt-0.5" />
                  <div>
                    <Label htmlFor="o-low" className="cursor-pointer font-medium">Low profile</Label>
                    <p className="text-xs text-muted-foreground">Prefer not to receive intro requests right now.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl mb-1">Preview your profile</h2>
              <p className="text-sm text-muted-foreground">Here&apos;s how others will see you.</p>
            </div>
            <div className="border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={data.photo ?? undefined} />
                  <AvatarFallback>{data.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{data.fullName}</p>
                  <p className="text-sm text-muted-foreground">{data.oneLineIntro}</p>
                </div>
              </div>
              {data.workingOn && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Working on</p>
                  <p className="text-sm">{data.workingOn}</p>
                </div>
              )}
              {data.curiousAbout && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Curious about</p>
                  <p className="text-sm">{data.curiousAbout}</p>
                </div>
              )}
              {data.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.topics.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
              {data.whoToMeet && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Wants to meet</p>
                  <p className="text-sm">{data.whoToMeet}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/50 px-6 py-4">
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 10 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue()}>
              Continue
              <ArrowRight className="size-4 ml-1" />
            </Button>
          )}
          {step === 10 && (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish profile"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
