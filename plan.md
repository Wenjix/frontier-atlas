# Frontier Atlas Backend — Onboarding Loop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend (database, auth, API routes, services) for Frontier Atlas's onboarding loop — from invitation claim through profile publish, floor directory, intro requests, notifications, and events.

**Architecture:** Next.js App Router API routes backed by Prisma + PostgreSQL. Auth.js v5 handles magic-link authentication. Service layer encapsulates business logic. Zod validates all inputs. No frontend wiring — backend only.

**Tech Stack:** Next.js 16 App Router, Prisma ORM, PostgreSQL, Auth.js v5 (next-auth@beta), Zod, TypeScript

---

## Context

Frontier Atlas is a community platform modeled as a building with themed floors. The frontend prototype is complete (16 floors, onboarding wizard, intro request flow, directory pages) but runs entirely on mock data. This plan adds the real backend.

### Spec Revisions (deviations from the original spec)

1. **No separate `users` table.** Auth.js v5 with PrismaAdapter creates its own `User`, `Account`, `Session`, `VerificationToken` tables. We extend the Auth.js `User` model rather than maintaining a parallel table. The spec's `authProvider` is already tracked in `Account.provider`; `lastLoginAt` is deferred.

2. **No `directory_members` denormalized table (Phase 1-3).** At early scale (dozens of members per floor), a query-time join across `Member` + `MemberProfile` + `MemberFloorMembership` with proper indexes is fast enough. This avoids dual-write complexity. Can add a materialized view later if needed.

3. **Invitation flow uses Auth.js integration.** The claim flow is: invitation link → Auth.js magic link sign-in → post-auth callback claims the invitation and creates member + membership. No separate claim API needed beyond the post-auth redirect handler.

4. **ILIKE search for MVP.** Full-text `tsvector` search is deferred. Simple `ILIKE` on concatenated fields is sufficient for <500 members per floor.

5. **Phase 5 is documentation only.** No empty tables created. Schema for contributions/roles/eligibilities is documented for future reference.

6. **Profile visibility `"leads"` → `"leads_only"` in DB.** Frontend shorthand differs from database enum values. API layer handles mapping.

### Frontend-to-Backend Enum Mappings

These matter for API route handlers:

| Domain | Frontend Value | Database Enum |
|--------|---------------|---------------|
| Visibility | `"floor"` | `FLOOR` |
| Visibility | `"tower"` | `TOWER` |
| Visibility | `"leads"` | `LEADS_ONLY` |
| Openness | `"very"` | `VERY_OPEN` |
| Openness | `"relevant"` | `OPEN_IF_RELEVANT` |
| Openness | `"low"` | `LOW_PROFILE` |
| Intro reason | `"shared-interest"` | `SHARED_INTEREST` |
| Intro reason | `"event-follow-up"` | `EVENT_FOLLOW_UP` |
| Connection | `"async"` | `QUICK_ASYNC_INTRO` |
| Connection | `"chat-15"` | `FIFTEEN_MIN_CHAT` |
| Connection | `"event"` | `MEET_AT_EVENT` |
| Connection | `"open"` | `OPEN_TO_WHATEVER` |
| Intro status | `"not-now"` | `NOT_NOW` |
| Intro status | `"alternate-path"` | `ALTERNATE_PATH` |

### Frontend Field Name → Backend Field Name

| Frontend (`OnboardingData`) | Backend (`MemberProfile`) |
|-----------------------------|---------------------------|
| `fullName` | `Member.fullName` |
| `photo` | `Member.avatarUrl` |
| `oneLineIntro` | `MemberProfile.oneLineIntro` |
| `website` | `MemberProfile.websiteUrl` |
| `workingOn` | `MemberProfile.workingOn` |
| `curiousAbout` | `MemberProfile.curiousAbout` |
| `topics` | `MemberProfileTopic` join table |
| `whoToMeet` | `MemberProfile.wantsToMeet` |
| `helpOthers` | `MemberProfile.canHelpWith` |
| `needHelp` | `MemberProfile.needsHelpWith` |
| `conversationStarter` | `MemberProfile.conversationStarter` |
| `visibility` | `MemberProfile.visibility` (mapped) |
| `openness` | `MemberProfile.introOpenness` (mapped) |
| `notifications` | Deferred (notification preferences) |
| `anythingElse` | Not stored |

---

## File Structure

```
# New files to create (all paths relative to project root)

# Environment
.env.local                              # DB URL, auth secrets, email config

# Prisma
prisma/schema.prisma                    # Full schema: 10 tables + Auth.js tables
prisma/seed.ts                          # Seed floors + test data from lib/floor-data.ts

# Prisma client singleton
lib/prisma.ts                           # PrismaClient singleton for serverless

# Auth
lib/auth.ts                             # Auth.js v5 config (PrismaAdapter + Email provider)
lib/auth-helpers.ts                     # requireAuth(), requireMember() helpers

# Shared
lib/errors.ts                           # AppError class + formatApiError()
lib/types/api.ts                        # ApiResponse<T>, ApiError, PaginatedResponse<T>

# Validation schemas
lib/validations/common.ts               # Shared Zod validators
lib/validations/invitation.ts           # Claim invitation schema
lib/validations/profile.ts              # Draft + publish schemas
lib/validations/intro-request.ts        # Create + respond schemas

# Service layer
lib/services/invitation-service.ts      # Validate token, claim, create member+membership
lib/services/profile-service.ts         # CRUD draft, publish with validation, update
lib/services/directory-service.ts       # Floor people query, search, featured members
lib/services/intro-service.ts           # Create, respond, eligibility, rate limiting
lib/services/notification-service.ts    # Create, list, mark read
lib/services/event-service.ts           # Floor events, upcoming, hosting-soon check

# API routes
app/api/auth/[...nextauth]/route.ts     # Auth.js catch-all
app/api/invitations/claim/route.ts      # POST claim invitation
app/api/me/profile/route.ts             # GET profile, PUT update published profile
app/api/me/profile/draft/route.ts       # PUT save draft
app/api/me/profile/publish/route.ts     # POST publish profile
app/api/me/intro-requests/received/route.ts  # GET received intros
app/api/me/intro-requests/sent/route.ts      # GET sent intros
app/api/me/notifications/route.ts       # GET notifications
app/api/me/notifications/[id]/read/route.ts  # POST mark read
app/api/floors/[floorId]/route.ts       # GET floor detail
app/api/floors/[floorId]/people/route.ts     # GET floor directory
app/api/floors/[floorId]/events/route.ts     # GET floor events
app/api/members/[memberId]/route.ts     # GET member public profile
app/api/intro-requests/route.ts         # POST create intro request
app/api/intro-requests/[id]/respond/route.ts # POST respond to intro
```

---

## Chunk 1: Foundation + Auth (Phase 1a)

### Task 1: Install dependencies

- [ ] **Step 1: Install Prisma, Auth.js, and adapter**

```bash
pnpm add prisma @prisma/client @auth/prisma-adapter next-auth@beta
pnpm add -D tsx
```

- [ ] **Step 2: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml prisma/schema.prisma .env
git commit -m "feat: add Prisma, Auth.js v5, and PrismaAdapter dependencies"
```

### Task 2: Create shared utilities

**Files:**
- Create: `lib/prisma.ts`
- Create: `lib/errors.ts`
- Create: `lib/types/api.ts`
- Create: `lib/validations/common.ts`

- [ ] **Step 1: Create Prisma singleton** (`lib/prisma.ts`)

```ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create error handling** (`lib/errors.ts`)

```ts
import { NextResponse } from "next/server"
import { ZodError } from "zod"

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR"

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = STATUS_MAP[code]
  ) {
    super(message)
  }
}

export function formatApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") } },
      { status: 400 }
    )
  }
  console.error("Unhandled error:", error)
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  )
}
```

- [ ] **Step 3: Create API response types** (`lib/types/api.ts`)

```ts
export type ApiResponse<T> = { success: true; data: T }
export type ApiErrorResponse = { success: false; error: { code: string; message: string } }
export type PaginatedResponse<T> = ApiResponse<{ items: T[]; total: number; page: number; pageSize: number }>
```

- [ ] **Step 4: Create common validators** (`lib/validations/common.ts`)

```ts
import { z } from "zod"

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const cuidSchema = z.string().min(1)
```

- [ ] **Step 5: Commit**

```bash
git add lib/prisma.ts lib/errors.ts lib/types/api.ts lib/validations/common.ts
git commit -m "feat: add shared utilities — Prisma singleton, error handling, API types, validators"
```

### Task 3: Write Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the full schema**

The schema includes:
- **Auth.js required tables**: `User` (extended), `Account`, `Session`, `VerificationToken`
- **Domain tables**: `Member`, `Floor`, `Invitation`, `MemberFloorMembership`, `MemberProfile`, `MemberProfileTopic`, `IntroRequest`, `Notification`, `Event`
- **Enums**: `FloorType`, `InvitationStatus`, `MembershipRole`, `MembershipStatus`, `ProfileStatus`, `ProfileVisibility`, `IntroOpenness`, `IntroRequestReason`, `PreferredConnection`, `IntroRequestStatus`, `AlternatePathType`, `NotificationType`, `EventStatus`

Key schema details:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth.js Models ───

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  member        Member?
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
  @@unique([identifier, token])
}

// ─── Domain Models ───

model Member {
  id        String   @id @default(cuid())
  userId    String   @unique
  fullName  String
  avatarUrl String?
  createdAt DateTime @default(now())

  user                 User                    @relation(fields: [userId], references: [id])
  memberships          MemberFloorMembership[]
  profile              MemberProfile?
  sentIntroRequests    IntroRequest[]          @relation("RequesterIntros")
  receivedIntroRequests IntroRequest[]         @relation("RecipientIntros")
  notifications        Notification[]
  hostedEvents         Event[]
}

model Floor {
  id               String    @id @default(cuid())
  number           String    @unique
  name             String
  icon             String?
  shortDescription String?
  floorType        FloorType
  isActive         Boolean   @default(true)
  createdAt        DateTime  @default(now())

  memberships MemberFloorMembership[]
  invitations Invitation[]
  profiles    MemberProfile[]          @relation("HomeFloor")
  events      Event[]
}

model Invitation {
  id              String           @id @default(cuid())
  email           String
  floorId         String
  status          InvitationStatus @default(ACCEPTED_PENDING_CLAIM)
  inviteTokenHash String           @unique
  acceptedAt      DateTime         @default(now())
  claimedAt       DateTime?
  expiresAt       DateTime?
  createdAt       DateTime         @default(now())

  floor Floor @relation(fields: [floorId], references: [id])

  @@index([email, status])
}

model MemberFloorMembership {
  id       String           @id @default(cuid())
  memberId String
  floorId  String
  role     MembershipRole   @default(MEMBER)
  status   MembershipStatus @default(ACTIVE)
  joinedAt DateTime         @default(now())

  member Member @relation(fields: [memberId], references: [id])
  floor  Floor  @relation(fields: [floorId], references: [id])

  @@unique([memberId, floorId])
  @@index([floorId])
}

model MemberProfile {
  id                  String            @id @default(cuid())
  memberId            String            @unique
  homeFloorId         String
  status              ProfileStatus     @default(DRAFT)
  oneLineIntro        String?
  workingOn           String?
  curiousAbout        String?
  wantsToMeet         String?
  canHelpWith         String?
  needsHelpWith       String?
  conversationStarter String?
  websiteUrl          String?
  visibility          ProfileVisibility @default(FLOOR)
  introOpenness       IntroOpenness     @default(VERY_OPEN)
  updatedAt           DateTime          @updatedAt
  publishedAt         DateTime?

  member    Member              @relation(fields: [memberId], references: [id])
  homeFloor Floor               @relation("HomeFloor", fields: [homeFloorId], references: [id])
  topics    MemberProfileTopic[]
}

model MemberProfileTopic {
  id              String @id @default(cuid())
  memberProfileId String
  topic           String

  profile MemberProfile @relation(fields: [memberProfileId], references: [id], onDelete: Cascade)

  @@unique([memberProfileId, topic])
}

model IntroRequest {
  id                    String             @id @default(cuid())
  requesterMemberId     String
  recipientMemberId     String
  reason                IntroRequestReason
  note                  String
  preferredConnection   PreferredConnection
  linkUrl               String?
  status                IntroRequestStatus @default(PENDING)
  recipientResponseNote String?
  alternatePathType     AlternatePathType?
  alternatePathUrl      String?
  createdAt             DateTime           @default(now())
  respondedAt           DateTime?

  requester Member @relation("RequesterIntros", fields: [requesterMemberId], references: [id])
  recipient Member @relation("RecipientIntros", fields: [recipientMemberId], references: [id])

  @@index([requesterMemberId])
  @@index([recipientMemberId])
  @@index([recipientMemberId, requesterMemberId, status])
}

model Notification {
  id        String           @id @default(cuid())
  memberId  String
  type      NotificationType
  entityId  String
  readAt    DateTime?
  createdAt DateTime         @default(now())

  member Member @relation(fields: [memberId], references: [id])

  @@index([memberId, readAt])
  @@index([memberId, createdAt])
}

model Event {
  id            String      @id @default(cuid())
  floorId       String
  title         String
  description   String?
  startsAt      DateTime
  endsAt        DateTime?
  hostMemberId  String?
  status        EventStatus @default(SCHEDULED)
  isRecurring   Boolean     @default(false)
  createdAt     DateTime    @default(now())

  floor Floor   @relation(fields: [floorId], references: [id])
  host  Member? @relation(fields: [hostMemberId], references: [id])

  @@index([floorId, startsAt])
}

// ─── Enums ───

enum FloorType {
  THEMATIC
  COMMONS
  PRIVATE
}

enum InvitationStatus {
  ACCEPTED_PENDING_CLAIM
  CLAIMED
  EXPIRED
  REVOKED
}

enum MembershipRole {
  MEMBER
  LEAD
  HOST
  STEWARD
}

enum MembershipStatus {
  ACTIVE
  INACTIVE
  PENDING
}

enum ProfileStatus {
  DRAFT
  PUBLISHED
}

enum ProfileVisibility {
  FLOOR
  TOWER
  LEADS_ONLY
}

enum IntroOpenness {
  VERY_OPEN
  OPEN_IF_RELEVANT
  LOW_PROFILE
}

enum IntroRequestReason {
  FEEDBACK
  COLLABORATION
  LEARNING
  SHARED_INTEREST
  EVENT_FOLLOW_UP
  OTHER
}

enum PreferredConnection {
  QUICK_ASYNC_INTRO
  FIFTEEN_MIN_CHAT
  MEET_AT_EVENT
  OPEN_TO_WHATEVER
}

enum IntroRequestStatus {
  PENDING
  ACCEPTED
  NOT_NOW
  PASSED
  ALTERNATE_PATH
  CANCELLED
}

enum AlternatePathType {
  MEET_AT_EVENT
  SEND_ASYNC_QUESTION
  FOLLOW_UP_LATER
  OTHER
}

enum NotificationType {
  ONBOARDING_COMPLETED
  INTRO_REQUEST_RECEIVED
  INTRO_REQUEST_ACCEPTED
  INTRO_REQUEST_NOT_NOW
  INTRO_REQUEST_PASSED
  INTRO_REQUEST_ALTERNATE_PATH
}

enum EventStatus {
  SCHEDULED
  CANCELLED
  COMPLETED
}
```

- [ ] **Step 2: Validate and generate migration**

```bash
npx prisma validate
npx prisma migrate dev --name init
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema with all domain models, enums, and indexes"
```

### Task 4: Configure Auth.js v5

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/auth-helpers.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `.env.local`

- [ ] **Step 1: Create `.env.local`** (template — not committed)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/frontier_atlas"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM="noreply@frontieratlas.com"
```

- [ ] **Step 2: Create Auth.js config** (`lib/auth.ts`)

```ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import EmailProvider from "next-auth/providers/email"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      const member = await prisma.member.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
      session.user.id = user.id
      session.user.memberId = member?.id ?? null
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
})
```

- [ ] **Step 3: Create auth helpers** (`lib/auth-helpers.ts`)

```ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED", "Not authenticated")
  }
  return session.user
}

export async function requireMember() {
  const user = await requireAuth()
  if (!user.memberId) {
    throw new AppError("FORBIDDEN", "No member profile. Claim your invitation first.")
  }
  return { userId: user.id, memberId: user.memberId }
}
```

- [ ] **Step 4: Create Auth.js route** (`app/api/auth/[...nextauth]/route.ts`)

```ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 5: Add Auth.js type augmentation** (in `lib/auth.ts` or a `types/next-auth.d.ts`)

```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      memberId: string | null
      email: string
      name?: string | null
      image?: string | null
    }
  }
}
```

- [ ] **Step 6: Verify — start dev server, navigate to `/api/auth/signin`**

```bash
pnpm dev
# Visit http://localhost:3000/api/auth/signin — should render Auth.js default sign-in page
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts lib/auth-helpers.ts app/api/auth/
git commit -m "feat: configure Auth.js v5 with PrismaAdapter and magic-link email provider"
```

---

## Chunk 2: Invitation Claim + Profile Draft/Publish (Phase 1b)

### Task 5: Invitation service

**Files:**
- Create: `lib/validations/invitation.ts`
- Create: `lib/services/invitation-service.ts`
- Create: `app/api/invitations/claim/route.ts`

- [ ] **Step 1: Create invitation validation** (`lib/validations/invitation.ts`)

```ts
import { z } from "zod"

export const claimInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
})
```

- [ ] **Step 2: Create invitation service** (`lib/services/invitation-service.ts`)

Key logic:
- `claimInvitation(userId: string, userEmail: string, token: string)`:
  1. Hash the token: `crypto.createHash("sha256").update(token).digest("hex")`
  2. Find invitation by `inviteTokenHash` where `status = ACCEPTED_PENDING_CLAIM`
  3. Validate email matches, not expired
  4. In a `prisma.$transaction`:
     - Create `Member` (or find existing by userId)
     - Create `MemberFloorMembership` with `role: MEMBER`, `status: ACTIVE`
     - Create `MemberProfile` with `status: DRAFT`, `homeFloorId` from invitation
     - Update invitation `status = CLAIMED`, `claimedAt = now()`
  5. Return `{ memberId, floorId, membershipStatus: "active" }`

- [ ] **Step 3: Create claim API route** (`app/api/invitations/claim/route.ts`)

```ts
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { token } = claimInvitationSchema.parse(body)
    const result = await claimInvitation(user.id, user.email!, token)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return formatApiError(error)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/validations/invitation.ts lib/services/invitation-service.ts app/api/invitations/
git commit -m "feat: add invitation claim flow — validates token, creates member + membership"
```

### Task 6: Profile service (draft + publish)

**Files:**
- Create: `lib/validations/profile.ts`
- Create: `lib/services/profile-service.ts`
- Create: `app/api/me/profile/route.ts`
- Create: `app/api/me/profile/draft/route.ts`
- Create: `app/api/me/profile/publish/route.ts`

- [ ] **Step 1: Create profile validation** (`lib/validations/profile.ts`)

```ts
import { z } from "zod"

export const profileDraftSchema = z.object({
  oneLineIntro: z.string().max(200).optional(),
  workingOn: z.string().max(1000).optional(),
  curiousAbout: z.string().max(1000).optional(),
  wantsToMeet: z.string().max(1000).optional(),
  canHelpWith: z.string().max(1000).optional(),
  needsHelpWith: z.string().max(1000).optional(),
  conversationStarter: z.string().max(500).nullable().optional(),
  websiteUrl: z.string().url().max(500).or(z.literal("")).nullable().optional(),
  visibility: z.enum(["FLOOR", "TOWER", "LEADS_ONLY"]).optional(),
  introOpenness: z.enum(["VERY_OPEN", "OPEN_IF_RELEVANT", "LOW_PROFILE"]).optional(),
  topics: z.array(z.string().max(50)).max(5).optional(),
})

// Used server-side to validate before publishing
export const profilePublishRequirements = z.object({
  oneLineIntro: z.string().min(1),
  workingOn: z.string().min(1),
  curiousAbout: z.string().min(1),
  wantsToMeet: z.string().min(1),
  canHelpWith: z.string().min(1),
  needsHelpWith: z.string().min(1),
  visibility: z.enum(["FLOOR", "TOWER", "LEADS_ONLY"]),
  introOpenness: z.enum(["VERY_OPEN", "OPEN_IF_RELEVANT", "LOW_PROFILE"]),
})
```

- [ ] **Step 2: Create profile service** (`lib/services/profile-service.ts`)

Functions:
- `getProfile(memberId)` — Returns member + profile + topics
- `saveDraft(memberId, data)` — Upserts profile fields. If `topics` provided, replace all topics. Sets `updatedAt`.
- `publishProfile(memberId)` — Validates all required fields present on existing profile. Checks member has active membership on `homeFloorId`. Validates `Member.fullName` is set. Sets `status = PUBLISHED`, `publishedAt = now()`. Creates `ONBOARDING_COMPLETED` notification. Returns profile.
- `updateProfile(memberId, data)` — For editing an already-published profile. Saves changes, keeps status as PUBLISHED.

- [ ] **Step 3: Create profile API routes**

`app/api/me/profile/route.ts`:
- GET: `requireMember()` → `getProfile(memberId)`
- PUT: `requireMember()` → validate with `profileDraftSchema` → `updateProfile(memberId, data)`

`app/api/me/profile/draft/route.ts`:
- PUT: `requireMember()` → validate with `profileDraftSchema` → `saveDraft(memberId, data)`

`app/api/me/profile/publish/route.ts`:
- POST: `requireMember()` → `publishProfile(memberId)`

- [ ] **Step 4: Verify — test draft save and publish flow**

```bash
# After seeding a test invitation and claiming it:
# PUT /api/me/profile/draft with partial data → 200
# POST /api/me/profile/publish with missing fields → 400 (validation error)
# PUT /api/me/profile/draft with all required fields → 200
# POST /api/me/profile/publish → 200, profile.status = "PUBLISHED"
```

- [ ] **Step 5: Commit**

```bash
git add lib/validations/profile.ts lib/services/profile-service.ts app/api/me/profile/
git commit -m "feat: add profile draft/publish — save onboarding answers, validate, publish"
```

### Task 7: Seed script + floor API

**Files:**
- Create: `prisma/seed.ts`
- Create: `app/api/floors/[floorId]/route.ts`

- [ ] **Step 1: Create seed script** (`prisma/seed.ts`)

Imports `floors` from `lib/floor-data.ts`. Maps each floor:
- `id` → use floor's existing `id` (e.g., `"floor-9"`)
- `number` → floor's `number` string
- `name` → floor's `name`
- `icon` → floor's `icon`
- `shortDescription` → floor's `description`
- `floorType` → map `"thematic"` → `THEMATIC`, `"commons"` → `COMMONS`, `"private"` → `PRIVATE`

Also seeds:
- Sample events from each floor's `events` array
- 2-3 test users + members + memberships + published profiles for development
- 1-2 test invitations in `ACCEPTED_PENDING_CLAIM` status

Add to `package.json`:
```json
"prisma": { "seed": "npx tsx prisma/seed.ts" }
```

- [ ] **Step 2: Run seed**

```bash
npx prisma db seed
```

- [ ] **Step 3: Create floor detail route** (`app/api/floors/[floorId]/route.ts`)

GET handler (no auth required): Fetches floor by ID with counts of active members and upcoming events. Returns floor metadata.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts app/api/floors/ package.json
git commit -m "feat: add seed script (floors + test data) and floor detail API"
```

---

## Chunk 3: Floor Directory + Member Detail (Phase 2)

### Task 8: Directory service

**Files:**
- Create: `lib/services/directory-service.ts`
- Create: `app/api/floors/[floorId]/people/route.ts`

- [ ] **Step 1: Create directory service** (`lib/services/directory-service.ts`)

Functions:
- `getFloorPeople(floorId, options: { search?, page?, pageSize? })`:
  1. Query `MemberFloorMembership` WHERE `floorId` AND `status = ACTIVE`
  2. JOIN `Member` + `MemberProfile` WHERE `profile.status = PUBLISHED` AND visibility check
  3. If `search` provided: `ILIKE` on `Member.fullName`, `MemberProfile.oneLineIntro`, `workingOn`, `curiousAbout`, `wantsToMeet`, `canHelpWith`, `needsHelpWith`
  4. Also query `MemberProfileTopic` for matching topics
  5. Return paginated results shaped as `MemberListItem[]`

- `getContextSignal(memberId, floorId)`:
  1. Check if hosting event on this floor within 7 days → `"hosting_soon"`
  2. Else check if `introOpenness = VERY_OPEN` → `"open_to_meet"`
  3. Else check if `joinedAt` within 14 days → `"new"`
  4. Else `null`

- `getFeaturedMembers(floorId, limit = 3)`:
  Returns members with non-null context signals, prioritized by signal type

- [ ] **Step 2: Create floor people route** (`app/api/floors/[floorId]/people/route.ts`)

GET handler: accepts query params `q` (search), `page`, `pageSize`. Returns `FloorPeopleData`-shaped response matching `lib/member-data.ts` interface:
```ts
{
  floor: { id, number, name, shortDescription },
  featuredMembers: FeaturedMember[],
  members: MemberListItem[],
  totalCount: number
}
```

- [ ] **Step 3: Verify**

```bash
# GET /api/floors/floor-9/people → returns seeded members
# GET /api/floors/floor-9/people?q=ai → filtered results
```

- [ ] **Step 4: Commit**

```bash
git add lib/services/directory-service.ts app/api/floors/
git commit -m "feat: add floor directory service — people list, search, featured members"
```

### Task 9: Member detail endpoint

**Files:**
- Create: `app/api/members/[memberId]/route.ts`

- [ ] **Step 1: Create member detail route** (`app/api/members/[memberId]/route.ts`)

GET handler: Fetches member + published profile + topics. Applies visibility rules:
- `FLOOR` visibility: only visible to members on the same floor
- `TOWER` visibility: visible to all authenticated members
- `LEADS_ONLY` visibility: visible only to floor leads on that floor

Returns `MemberDetail`-shaped response matching `lib/member-data.ts` interface.

- [ ] **Step 2: Verify**

```bash
# GET /api/members/{memberId} → returns full profile (when authorized)
# GET /api/members/{memberId} as non-floor-member with FLOOR visibility → 403
```

- [ ] **Step 3: Commit**

```bash
git add app/api/members/
git commit -m "feat: add member detail endpoint with visibility-based access control"
```

---

## Chunk 4: Intro Requests + Notifications (Phase 3)

### Task 10: Intro request service

**Files:**
- Create: `lib/validations/intro-request.ts`
- Create: `lib/services/intro-service.ts`
- Create: `app/api/intro-requests/route.ts`
- Create: `app/api/intro-requests/[id]/respond/route.ts`
- Create: `app/api/me/intro-requests/received/route.ts`
- Create: `app/api/me/intro-requests/sent/route.ts`

- [ ] **Step 1: Create intro request validation** (`lib/validations/intro-request.ts`)

```ts
import { z } from "zod"

export const createIntroRequestSchema = z.object({
  recipientMemberId: z.string().min(1),
  reason: z.enum(["FEEDBACK", "COLLABORATION", "LEARNING", "SHARED_INTEREST", "EVENT_FOLLOW_UP", "OTHER"]),
  note: z.string().min(20, "Note must be at least 20 characters").max(2000),
  preferredConnection: z.enum(["QUICK_ASYNC_INTRO", "FIFTEEN_MIN_CHAT", "MEET_AT_EVENT", "OPEN_TO_WHATEVER"]),
  linkUrl: z.string().url().max(500).nullable().optional(),
})

export const respondIntroRequestSchema = z.object({
  action: z.enum(["ACCEPTED", "NOT_NOW", "PASSED", "ALTERNATE_PATH"]),
  responseNote: z.string().max(1000).nullable().optional(),
  alternatePathType: z.enum(["MEET_AT_EVENT", "SEND_ASYNC_QUESTION", "FOLLOW_UP_LATER", "OTHER"]).nullable().optional(),
  alternatePathUrl: z.string().url().max(500).nullable().optional(),
})
```

- [ ] **Step 2: Create intro service** (`lib/services/intro-service.ts`)

Functions:
- `createIntroRequest(requesterMemberId, data)`:
  **Eligibility checks:**
  1. Cannot request intro to self
  2. Recipient must have published profile
  3. Recipient `introOpenness` must not be `LOW_PROFILE`
  4. Visibility check: if `FLOOR`, requester must share a floor with recipient; if `LEADS_ONLY`, requester must be a lead
  5. No existing `PENDING` request from same requester to same recipient
  6. Max 5 sent requests in rolling 24 hours
  7. If recipient previously responded `NOT_NOW` or `PASSED`, 30-day cooldown
  Creates request with `status = PENDING`. Creates `INTRO_REQUEST_RECEIVED` notification for recipient.

- `respondToIntroRequest(respondingMemberId, requestId, data)`:
  Validates responder is the recipient. Validates current status is `PENDING`. Updates status, response fields, `respondedAt`. Creates notification for requester based on action.

- `getReceivedRequests(memberId, page, pageSize)`: Paginated, most recent first, with requester member info.
- `getSentRequests(memberId, page, pageSize)`: Paginated, most recent first, with recipient member info.

- [ ] **Step 3: Create API routes**

`app/api/intro-requests/route.ts` — POST: create intro request
`app/api/intro-requests/[id]/respond/route.ts` — POST: respond
`app/api/me/intro-requests/received/route.ts` — GET: list received
`app/api/me/intro-requests/sent/route.ts` — GET: list sent

Each follows the standard pattern: `requireMember()` → validate → service call → JSON response.

- [ ] **Step 4: Verify**

```bash
# POST /api/intro-requests → creates request, recipient gets notification
# POST /api/intro-requests (to self) → 400
# POST /api/intro-requests (to low_profile) → 403
# POST /api/intro-requests (duplicate pending) → 409
# POST /api/intro-requests/[id]/respond { action: "ACCEPTED" } → 200
# GET /api/me/intro-requests/received → lists incoming
# GET /api/me/intro-requests/sent → lists outgoing
```

- [ ] **Step 5: Commit**

```bash
git add lib/validations/intro-request.ts lib/services/intro-service.ts app/api/intro-requests/ app/api/me/intro-requests/
git commit -m "feat: add intro request state machine — create, respond, eligibility, rate limiting"
```

### Task 11: Notification service

**Files:**
- Create: `lib/services/notification-service.ts`
- Create: `app/api/me/notifications/route.ts`
- Create: `app/api/me/notifications/[id]/read/route.ts`

- [ ] **Step 1: Create notification service** (`lib/services/notification-service.ts`)

Functions:
- `createNotification(memberId, type, entityId)`: Insert row.
- `getNotifications(memberId, options: { unreadOnly?, page?, pageSize? })`: Paginated, most recent first. Returns `{ items, total, unreadCount }`.
- `markRead(memberId, notificationId)`: Validate notification belongs to member, set `readAt = now()`.

- [ ] **Step 2: Create notification API routes**

`app/api/me/notifications/route.ts` — GET: list notifications
`app/api/me/notifications/[id]/read/route.ts` — POST: mark as read

- [ ] **Step 3: Verify**

```bash
# After publishing profile → GET /api/me/notifications → includes ONBOARDING_COMPLETED
# After receiving intro → GET /api/me/notifications → includes INTRO_REQUEST_RECEIVED
# POST /api/me/notifications/[id]/read → readAt is set
```

- [ ] **Step 4: Commit**

```bash
git add lib/services/notification-service.ts app/api/me/notifications/
git commit -m "feat: add notification service — create, list, mark read"
```

---

## Chunk 5: Events + Context Signals (Phase 4)

### Task 12: Event service

**Files:**
- Create: `lib/services/event-service.ts`
- Create: `app/api/floors/[floorId]/events/route.ts`

- [ ] **Step 1: Create event service** (`lib/services/event-service.ts`)

Functions:
- `getFloorEvents(floorId, options: { upcoming?, page?, pageSize? })`: Returns events for a floor. If `upcoming`, filters `startsAt > now()` and `status = SCHEDULED`, ordered by `startsAt ASC`.
- `isHostingSoon(memberId)`: Returns `true` if member is `hostMemberId` on any event starting within 7 days.

- [ ] **Step 2: Create floor events route** (`app/api/floors/[floorId]/events/route.ts`)

GET handler: accepts `upcoming` boolean query param. Returns list of events.

- [ ] **Step 3: Commit**

```bash
git add lib/services/event-service.ts app/api/floors/
git commit -m "feat: add event service and floor events endpoint"
```

### Task 13: Context signals in directory

**Files:**
- Modify: `lib/services/directory-service.ts`

- [ ] **Step 1: Enhance `getContextSignal` in directory service**

The function already exists from Task 8. Ensure it correctly uses `event-service.ts` for `hosting_soon` check and applies the priority chain: `hosting_soon` > `open_to_meet` > `new` > `null`.

- [ ] **Step 2: Enhance `getFeaturedMembers` to use signals as priority**

Members with `hosting_soon` first, then `open_to_meet`, then `new`. Return top 3.

- [ ] **Step 3: Verify**

```bash
# Seed an event with hostMemberId set and startsAt within 7 days
# GET /api/floors/[floorId]/people → that member shows contextSignal: "hosting_soon"
```

- [ ] **Step 4: Commit**

```bash
git add lib/services/directory-service.ts
git commit -m "feat: add context signal derivation to directory — hosting_soon, open_to_meet, new"
```

---

## Chunk 6: Future-Proofing Documentation (Phase 5)

### Task 14: Document future schema

**Files:**
- This is documentation only. No code changes.

- [ ] **Step 1: The following models are planned for future implementation (post-EAS):**

```
MemberContribution:
  id, memberId, floorId?, type, description, evidenceUrl?, issuedBy?,
  verifiedAt?, status, createdAt

MemberRole:
  id, memberId, floorId?, roleType, grantedBy?, grantedAt, expiresAt?,
  status, createdAt

MemberEligibility:
  id, memberId, eligibilityType, criteria?, grantedAt, expiresAt?,
  status, createdAt
```

Each has: stable ID, member FK, floor FK (optional), issuer/source, timestamps, evidence URL, status. These can later map to `internal record → attestation payload` without refactoring the product.

**No tables created. No migration. Schema is documented here for alignment.**

---

## Verification Plan

After all phases are complete, verify end-to-end:

1. **Auth**: Start dev server → navigate to `/api/auth/signin` → enter email → receive magic link → authenticated session
2. **Invitation claim**: `POST /api/invitations/claim` with valid token → member + membership created → session now includes `memberId`
3. **Profile draft**: `PUT /api/me/profile/draft` with partial data → 200, draft saved
4. **Profile publish (failure)**: `POST /api/me/profile/publish` with missing required fields → 400 with clear error
5. **Profile publish (success)**: Fill all required fields via draft → `POST /api/me/profile/publish` → 200, status = PUBLISHED
6. **Directory**: `GET /api/floors/floor-9/people` → published member appears in list with context signal
7. **Member detail**: `GET /api/members/{memberId}` → full profile returned (visibility permitting)
8. **Intro request**: `POST /api/intro-requests` → request created, recipient notification created
9. **Intro response**: `POST /api/intro-requests/{id}/respond` → status updated, requester notification created
10. **Notifications**: `GET /api/me/notifications` → shows onboarding + intro notifications
11. **Events**: `GET /api/floors/floor-9/events?upcoming=true` → returns seeded upcoming events
12. **Run Prisma validation**: `npx prisma validate` passes
13. **Run build**: `pnpm build` succeeds without errors
