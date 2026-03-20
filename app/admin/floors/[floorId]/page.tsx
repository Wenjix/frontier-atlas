"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FloorDetail {
  id: string
  name: string
  nickname?: string
  icon?: string
  description?: string
  shortDescription?: string
  tags?: string[]
  bestFor?: string
  character?: string
  floorType: string
  isActive: boolean
}

interface Lead {
  membershipId: string
  memberId: string
  fullName: string
  avatarUrl: string | null
  role: string
  helpsWith: string | null
}

interface RosterMember {
  membershipId: string
  memberId: string
  fullName: string
  avatarUrl: string | null
  role: string
  profileStatus: string | null
  joinedAt: string
}

interface RosterResponse {
  items: RosterMember[]
  total: number
  page: number
  pageSize: number
}

interface MemberSearchResult {
  id: string
  fullName: string
  email: string
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminFloorDetailPage() {
  const params = useParams<{ floorId: string }>()
  const floorId = params.floorId

  const [floor, setFloor] = useState<FloorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFloor = useCallback(() => {
    setLoading(true)
    api
      .get<FloorDetail>(`/api/admin/floors/${floorId}`)
      .then(setFloor)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [floorId])

  useEffect(() => {
    loadFloor()
  }, [loadFloor])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (error || !floor) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Floor not found"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">
        {floor.icon ? `${floor.icon} ` : ""}
        {floor.name}
      </h1>

      <Tabs defaultValue="metadata">
        <TabsList>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="mt-4">
          <MetadataTab floor={floor} onSaved={loadFloor} />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <LeadsTab floorId={floorId} />
        </TabsContent>

        <TabsContent value="roster" className="mt-4">
          <RosterTab floorId={floorId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1: Metadata
// ---------------------------------------------------------------------------

function MetadataTab({
  floor,
  onSaved,
}: {
  floor: FloorDetail
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: floor.name,
    nickname: floor.nickname ?? "",
    icon: floor.icon ?? "",
    description: floor.description ?? "",
    shortDescription: floor.shortDescription ?? "",
    tags: (floor.tags ?? []).join(", "),
    bestFor: floor.bestFor ?? "",
    character: floor.character ?? "",
    floorType: floor.floorType,
    isActive: floor.isActive,
  })
  const [saving, setSaving] = useState(false)

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.patch(`/api/admin/floors/${floor.id}`, {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      toast.success("Floor updated")
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            value={form.nickname}
            onChange={(e) => update("nickname", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Input
            id="icon"
            value={form.icon}
            onChange={(e) => update("icon", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floorType">Floor Type</Label>
          <Select
            value={form.floorType}
            onValueChange={(v) => update("floorType", v)}
          >
            <SelectTrigger id="floorType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="THEMATIC">Thematic</SelectItem>
              <SelectItem value="COMMONS">Commons</SelectItem>
              <SelectItem value="PRIVATE">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortDescription">Short Description</Label>
        <Input
          id="shortDescription"
          value={form.shortDescription}
          onChange={(e) => update("shortDescription", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          rows={4}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bestFor">Best For</Label>
          <Input
            id="bestFor"
            value={form.bestFor}
            onChange={(e) => update("bestFor", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="character">Character</Label>
          <Input
            id="character"
            value={form.character}
            onChange={(e) => update("character", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={form.tags}
          onChange={(e) => update("tags", e.target.value)}
          placeholder="tag1, tag2, tag3"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          checked={form.isActive}
          onCheckedChange={(checked) => update("isActive", !!checked)}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Spinner className="mr-2" />}
        Save Changes
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2: Leads
// ---------------------------------------------------------------------------

function LeadsTab({ floorId }: { floorId: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  // Add lead state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedMember, setSelectedMember] =
    useState<MemberSearchResult | null>(null)
  const [selectedRole, setSelectedRole] = useState("LEAD")
  const [assigning, setAssigning] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadLeads = useCallback(() => {
    setLoading(true)
    api
      .get<Lead[]>(`/api/admin/floors/${floorId}/roles`)
      .then(setLeads)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [floorId])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearching(true)
      api
        .get<MemberSearchResult[]>(
          `/api/admin/members/search?q=${encodeURIComponent(searchQuery)}`
        )
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  async function handleRemoveLead(lead: Lead) {
    try {
      await api.delete(`/api/admin/floors/${floorId}/roles/${lead.membershipId}`)
      toast.success(`Removed ${lead.fullName}`)
      loadLeads()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove lead")
    }
  }

  async function handleAssign() {
    if (!selectedMember) return
    setAssigning(true)
    try {
      await api.post(`/api/admin/floors/${floorId}/roles`, {
        memberId: selectedMember.id,
        role: selectedRole,
      })
      toast.success(`Assigned ${selectedMember.fullName} as ${selectedRole}`)
      setSelectedMember(null)
      setSearchQuery("")
      setSearchResults([])
      loadLeads()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign role"
      )
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="size-5" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Current leads */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Current Leads</h3>
        {leads.length === 0 && (
          <p className="text-sm text-muted-foreground">No leads assigned.</p>
        )}
        <div className="space-y-2">
          {leads.map((lead) => (
            <div
              key={lead.membershipId}
              className="flex items-center justify-between rounded-md border px-4 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{lead.fullName}</span>
                <Badge variant="secondary">{lead.role}</Badge>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveLead(lead)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Add lead */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Add Lead</h3>

        <div className="relative">
          <Input
            placeholder="Search members by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedMember(null)
            }}
          />
          {searching && (
            <Spinner className="absolute right-3 top-2.5 size-4" />
          )}

          {searchResults.length > 0 && !selectedMember && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
              {searchResults.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => {
                    setSelectedMember(member)
                    setSearchQuery(member.fullName)
                    setSearchResults([])
                  }}
                >
                  <span className="font-medium">{member.fullName}</span>
                  <span className="text-muted-foreground">{member.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMember && (
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="HOST">Host</SelectItem>
                  <SelectItem value="STEWARD">Steward</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning && <Spinner className="mr-2" />}
              Assign {selectedMember.fullName}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3: Roster
// ---------------------------------------------------------------------------

function RosterTab({ floorId }: { floorId: string }) {
  const [roster, setRoster] = useState<RosterResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRoster = useCallback(
    (s: string, p: number) => {
      setLoading(true)
      api
        .get<RosterResponse>(
          `/api/admin/floors/${floorId}/roster?search=${encodeURIComponent(s)}&page=${p}&pageSize=${pageSize}`
        )
        .then(setRoster)
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false))
    },
    [floorId]
  )

  useEffect(() => {
    loadRoster("", 1)
  }, [loadRoster])

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      loadRoster(value, 1)
    }, 300)
  }

  const totalPages = Math.max(1, Math.ceil(roster.total / pageSize))

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search members..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner className="size-5" />
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Profile Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {roster.items.map((member) => (
                  <tr
                    key={member.membershipId}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{member.fullName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{member.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          member.profileStatus === "PUBLISHED"
                            ? "default"
                            : "outline"
                        }
                      >
                        {member.profileStatus ?? "NO PROFILE"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {roster.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {roster.total} member{roster.total !== 1 ? "s" : ""} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1
                  setPage(p)
                  loadRoster(search, p)
                }}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1
                  setPage(p)
                  loadRoster(search, p)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
