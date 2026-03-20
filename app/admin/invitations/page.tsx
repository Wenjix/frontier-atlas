"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

interface Floor {
  id: string
  name: string
}

interface CreatedInvitation {
  email: string
  token: string
}

interface Invitation {
  id: string
  email: string
  floorId: string
  floorName: string
  status: string
  createdAt: string
  claimedAt?: string
}

interface InvitationListResponse {
  items: Invitation[]
  total: number
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminInvitationsPage() {
  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-serif">Invitations</h1>
      <CreateInvitationsSection />
      <hr />
      <InvitationHistorySection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Invitations
// ---------------------------------------------------------------------------

function CreateInvitationsSection() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [floorsLoading, setFloorsLoading] = useState(true)
  const [emailsText, setEmailsText] = useState("")
  const [selectedFloorId, setSelectedFloorId] = useState("")
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<CreatedInvitation[]>([])

  useEffect(() => {
    api
      .get<Floor[]>("/api/admin/floors")
      .then((data) => {
        setFloors(data)
        if (data.length > 0) setSelectedFloorId(data[0].id)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setFloorsLoading(false))
  }, [])

  async function handleGenerate() {
    const emails = emailsText
      .split(/[,\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (emails.length === 0) {
      toast.error("Enter at least one email address")
      return
    }
    if (!selectedFloorId) {
      toast.error("Select a floor")
      return
    }

    setGenerating(true)
    try {
      const data = await api.post<CreatedInvitation[]>(
        "/api/admin/invitations",
        {
          emails,
          floorId: selectedFloorId,
        }
      )
      setResults(data)
      setEmailsText("")
      toast.success(`Created ${data.length} invitation(s)`)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invitations"
      )
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Failed to copy")
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">Create Invitations</h2>

      <div className="space-y-2">
        <Label htmlFor="emails">
          Email Addresses (one per line or comma-separated)
        </Label>
        <Textarea
          id="emails"
          rows={5}
          placeholder={"alice@example.com\nbob@example.com"}
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Floor</Label>
        {floorsLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a floor" />
            </SelectTrigger>
            <SelectContent>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button onClick={handleGenerate} disabled={generating}>
        {generating && <Spinner className="mr-2" />}
        Generate Invitations
      </Button>

      {/* Results table */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Generated Invitations</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Invite Token
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Copy</th>
                </tr>
              </thead>
              <tbody>
                {results.map((inv) => (
                  <tr
                    key={inv.token}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">{inv.email}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {inv.token}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(inv.token)}
                      >
                        Copy
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invitation History
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ["ALL", "ACCEPTED_PENDING_CLAIM", "CLAIMED", "EXPIRED", "REVOKED"]

function InvitationHistorySection() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [floors, setFloors] = useState<Floor[]>([])
  const [filterFloor, setFilterFloor] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")

  // Load floors for filter
  useEffect(() => {
    api
      .get<Floor[]>("/api/admin/floors")
      .then(setFloors)
      .catch(() => {})
  }, [])

  const loadInvitations = useCallback(
    (p: number) => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
      })
      if (filterFloor !== "ALL") params.set("floorId", filterFloor)
      if (filterStatus !== "ALL") params.set("status", filterStatus)

      api
        .get<InvitationListResponse>(
          `/api/admin/invitations?${params.toString()}`
        )
        .then((data) => {
          setInvitations(data.items)
          setTotal(data.total)
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false))
    },
    [filterFloor, filterStatus]
  )

  useEffect(() => {
    setPage(1)
    loadInvitations(1)
  }, [loadInvitations])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function statusBadgeVariant(
    status: string
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "CLAIMED":
        return "default"
      case "PENDING":
        return "secondary"
      case "EXPIRED":
      case "REVOKED":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Invitation History</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Floor</Label>
          <Select value={filterFloor} onValueChange={setFilterFloor}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "All Statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Floor</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">{inv.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.floorName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.claimedAt
                        ? new Date(inv.claimedAt).toLocaleDateString()
                        : "--"}
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No invitations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {total} invitation{total !== 1 ? "s" : ""} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1
                  setPage(p)
                  loadInvitations(p)
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
                  loadInvitations(p)
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
