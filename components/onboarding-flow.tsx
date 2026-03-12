"use client"

import { useState, useCallback } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, Upload, X, Check, Sparkles } from "lucide-react"

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
  notifications: string[]
  anythingElse: string
}

const SUGGESTED_TOPICS = [
  "AI", "Robotics", "Biotech", "Health", "Longevity", "Arts", "Music", 
  "Makers", "Crypto", "Design", "Community", "Fundraising", "Hardware", 
  "Events", "Human Flourishing"
]

interface OnboardingFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorName?: string
}

export function OnboardingFlow({ open, onOpenChange, floorName = "AI" }: OnboardingFlowProps) {
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
    notifications: [],
    anythingElse: ""
  })
  const [customTopic, setCustomTopic] = useState("")

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

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

  const toggleNotification = (value: string) => {
    setData(prev => {
      if (prev.notifications.includes(value)) {
        return { ...prev, notifications: prev.notifications.filter(n => n !== value) }
      }
      return { ...prev, notifications: [...prev.notifications, value] }
    })
  }

  const canContinue = () => {
    switch (step) {
      case 1:
        return data.fullName.trim().length > 0 && data.oneLineIntro.trim().length > 0
      case 2:
        return data.workingOn.trim().length > 0 && data.curiousAbout.trim().length > 0 && data.topics.length > 0
      case 3:
        return data.whoToMeet.trim().length > 0 && data.helpOthers.trim().length > 0 && data.needHelp.trim().length > 0
      case 4:
        return true
      default:
        return true
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset after close animation
    setTimeout(() => {
      setStep(0)
    }, 300)
  }

  const [publishing, setPublishing] = useState(false)

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
      setStep(6)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish profile")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
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

        {/* Steps 1-5: Form Steps */}
        {step >= 1 && step <= 5 && (
          <div className="flex flex-col">
            {/* Progress Header */}
            {step <= 4 && (
              <div className="px-8 pt-6 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground font-mono">
                    Step {step} of 4
                  </span>
                  <button 
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(step / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Step 1: About You */}
            {step === 1 && (
              <div className="p-8">
                <h2 className="font-serif text-xl text-foreground mb-1">Start with the basics</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Give the floor a quick sense of who you are.
                </p>

                <div className="space-y-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your name"
                      value={data.fullName}
                      onChange={(e) => updateData({ fullName: e.target.value })}
                    />
                  </div>

                  {/* Photo */}
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
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Upload className="size-4 mr-2" />
                          Upload photo
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          Skip for now
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* One-line intro */}
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

                  {/* Website */}
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
                    <p className="text-xs text-muted-foreground/70">
                      A personal site, company page, GitHub, or anything people should see first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: What you're working on */}
            {step === 2 && (
              <div className="p-8">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  What are you focused on right now?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  This is the part people will care about most.
                </p>

                <div className="space-y-6">
                  {/* Working on */}
                  <div className="space-y-2">
                    <Label htmlFor="workingOn">What are you working on right now?</Label>
                    <p className="text-xs text-muted-foreground">
                      A few sentences is enough. Tell people what you're actually building, exploring, or spending time on.
                    </p>
                    <Textarea
                      id="workingOn"
                      placeholder="I'm building a visual control layer for AI-generated tools. Right now I'm focused on safe editing workflows, live previews, and making AI-built products easier to update without breaking them."
                      value={data.workingOn}
                      onChange={(e) => updateData({ workingOn: e.target.value })}
                      rows={4}
                    />
                  </div>

                  {/* Curious about */}
                  <div className="space-y-2">
                    <Label htmlFor="curiousAbout">What are you curious about right now?</Label>
                    <p className="text-xs text-muted-foreground">
                      What topics, questions, or rabbit holes are on your mind these days?
                    </p>
                    <Textarea
                      id="curiousAbout"
                      placeholder="I'm especially curious about social infrastructure, AI-native interfaces, and how creative communities can coordinate without becoming too rigid."
                      value={data.curiousAbout}
                      onChange={(e) => updateData({ curiousAbout: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Topics */}
                  <div className="space-y-2">
                    <Label>Topics you're interested in</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose up to 5.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
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
                    {/* Custom topic */}
                    <div className="flex gap-2 mt-3">
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
                    {data.topics.length >= 5 && (
                      <p className="text-xs text-muted-foreground">Maximum 5 topics selected.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: How you want to connect */}
            {step === 3 && (
              <div className="p-8">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  Make it easier for the right people to find you
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Tell the floor what kinds of conversations and connections would be useful.
                </p>

                <div className="space-y-6">
                  {/* Who to meet */}
                  <div className="space-y-2">
                    <Label htmlFor="whoToMeet">Who would you love to meet here?</Label>
                    <p className="text-xs text-muted-foreground">
                      Be as practical or specific as you want.
                    </p>
                    <Textarea
                      id="whoToMeet"
                      placeholder="AI infra engineers, robotics founders, design-minded product builders, and people thinking about community systems."
                      value={data.whoToMeet}
                      onChange={(e) => updateData({ whoToMeet: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Help others */}
                  <div className="space-y-2">
                    <Label htmlFor="helpOthers">What are you happy to help with?</Label>
                    <p className="text-xs text-muted-foreground">
                      What do people tend to come to you for?
                    </p>
                    <Textarea
                      id="helpOthers"
                      placeholder="Product strategy, agent system design, founder feedback, and turning vague ideas into clearer product directions."
                      value={data.helpOthers}
                      onChange={(e) => updateData({ helpOthers: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Need help */}
                  <div className="space-y-2">
                    <Label htmlFor="needHelp">What would be useful help for you right now?</Label>
                    <p className="text-xs text-muted-foreground">
                      This can be technical, social, creative, or practical.
                    </p>
                    <Textarea
                      id="needHelp"
                      placeholder="I'd love feedback on the product concept, intros to people designing collaborative spaces, and strong visual/product design collaborators."
                      value={data.needHelp}
                      onChange={(e) => updateData({ needHelp: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Conversation starter */}
                  <div className="space-y-2">
                    <Label htmlFor="conversationStarter">
                      Good conversation starter
                      <span className="text-muted-foreground/60 font-normal ml-1">optional</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      A small detail can make introductions much easier.
                    </p>
                    <Input
                      id="conversationStarter"
                      placeholder="Ask me about board games, weird interfaces, or the future of social spaces for humans and AI."
                      value={data.conversationStarter}
                      onChange={(e) => updateData({ conversationStarter: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Visibility and preferences */}
            {step === 4 && (
              <div className="p-8">
                <h2 className="font-serif text-xl text-foreground mb-1">
                  Choose how visible you want to be
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  You can keep this lightweight and change it later.
                </p>

                <div className="space-y-8">
                  {/* Visibility */}
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
                          <div className="text-xs text-muted-foreground">
                            Visible to members and leads on this floor
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="tower" id="vis-tower" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Across the tower</div>
                          <div className="text-xs text-muted-foreground">
                            Visible to members across Frontier
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="leads" id="vis-leads" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Floor leads only for now</div>
                          <div className="text-xs text-muted-foreground">
                            Visible to leads until you're ready
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  {/* Openness */}
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
                          <div className="text-xs text-muted-foreground">
                            I'm happy to meet new people
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="relevant" id="open-relevant" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Open if relevant</div>
                          <div className="text-xs text-muted-foreground">
                            Best when there's a clear fit
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="low" id="open-low" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Keeping a low profile for now</div>
                          <div className="text-xs text-muted-foreground">
                            I'd prefer to stay quieter
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-3">
                    <Label>What would you like to hear about?</Label>
                    <p className="text-xs text-muted-foreground">Choose any that sound useful.</p>
                    <div className="space-y-2">
                      {["Events", "Office hours", "Small group intros", "Workshops", "None for now"].map(item => (
                        <label key={item} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                          <Checkbox 
                            checked={data.notifications.includes(item)}
                            onCheckedChange={() => toggleNotification(item)}
                          />
                          <span className="text-sm">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Anything else */}
                  <div className="space-y-2">
                    <Label htmlFor="anythingElse">
                      Anything else you'd like people here to know?
                      <span className="text-muted-foreground/60 font-normal ml-1">optional</span>
                    </Label>
                    <Textarea
                      id="anythingElse"
                      placeholder="Anything helpful, personal, or practical that doesn't fit above."
                      value={data.anythingElse}
                      onChange={(e) => updateData({ anythingElse: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Preview */}
            {step === 5 && (
              <div className="p-8">
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

                {/* AI Rewrite Option */}
                <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Want help tightening this up?</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        We can turn your answers into a cleaner floor profile.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Rewrite for me</Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">Keep my version</Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="border border-border rounded-xl overflow-hidden">
                  {/* Header */}
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

                  {/* Content */}
                  <div className="p-6 space-y-5">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        Working on
                      </h4>
                      <p className="text-sm">{data.workingOn || "—"}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        Curious about
                      </h4>
                      <p className="text-sm">{data.curiousAbout || "—"}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        Looking to meet
                      </h4>
                      <p className="text-sm">{data.whoToMeet || "—"}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        Happy to help with
                      </h4>
                      <p className="text-sm">{data.helpOthers || "—"}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        Would love help with
                      </h4>
                      <p className="text-sm">{data.needHelp || "—"}</p>
                    </div>

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
            {step >= 1 && step <= 5 && (
              <div className="px-8 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(prev => prev - 1)}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Back
                </Button>
                {step < 4 && (
                  <Button onClick={() => setStep(prev => prev + 1)} disabled={!canContinue()}>
                    Continue
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                )}
                {step === 4 && (
                  <Button onClick={() => setStep(5)}>
                    Preview profile
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                )}
                {step === 5 && (
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
            )}
          </div>
        )}

        {/* Step 6: Completion */}
        {step === 6 && (
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check className="size-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl text-foreground mb-4">
                You're visible now
              </h2>
              <p className="text-muted-foreground mb-2">
                Your profile is live on Floor {floorName}. The floor can now get a better sense 
                of what you're working on and how to connect with you.
              </p>
              <p className="text-sm text-muted-foreground/70 mb-8">
                Next up, we'll show you a few people and events that may be worth checking out.
              </p>
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={handleClose} className="w-full">
                  See people to know
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
                  Go to floor page
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
