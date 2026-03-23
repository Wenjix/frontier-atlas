# The Frontier Atlas Web3 Synthesis Plan

> **Hybrid of three plans:** Claude (auth architecture, security, UX), GPT (access control, acceptance criteria, conservatism), Gemini (presentation, diagrams, comparison tables). Optimized for hackathon demo targeting **Moonpay OpenWallet**, **ENS Identity**, and **Self Protocol** prize tracks.

---

## 1. Executive Summary

**The Problem:** Frontier Atlas uses centralized email magic links for auth, manual admin invitations for floor access, and manual profile entry during onboarding. This limits interoperability with the crypto ecosystem and creates friction.

**The Solution:** A surgical Web3 layer that preserves 85%+ of the existing codebase while adding:
1. **Wallet-first SIWE auth** (Moonpay OpenWallet Standard via EIP-6963) — sign in with any browser wallet
2. **ENS Identity auto-population** — skip onboarding steps by pulling name/avatar/bio from the blockchain
3. **Self Protocol floor gating** — replace invitation tokens with cryptographic verification for Floor 12

**Architecture philosophy:** 0 contracts, offchain-first. PostgreSQL stays the system of record. Web3 is an identity and access layer, not a storage layer.

---

## 2. Architecture Diagrams

**Authentication & Identity Flow (Moonpay + ENS)**
```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User Browser │────▶│ EIP-6963 Wallets  │────▶│ SIWE Sign-In     │
│              │     │ (Moonpay/MetaMask)│     │ (NextAuth + JWT)  │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Prisma DB   │◀────│ Next.js Backend   │◀────│ viem ENS Resolver │
│ (Postgres)  │     │ (User upsert)     │     │ (Mainnet RPC)     │
└─────────────┘     └──────────────────┘     └──────────────────┘
```

**Self Protocol Floor Access Flow**
```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ "Join Floor" │────▶│ Self Protocol QR   │────▶│ POST /verify-pass │
│ Button       │     │ (@selfxyz/qrcode) │     │ (Next.js API)     │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                       │
                                                       ▼
┌─────────────┐                              ┌──────────────────┐
│ Floor Unlocks│◀─────────────────────────────│ MemberFloor      │
│ (Blur fades) │                              │ Membership created│
└─────────────┘                              └──────────────────┘
```

---

## 3. Phase 0: Foundation (~1 hour)

### 0A. Dependencies

```bash
pnpm add viem siwe @selfxyz/core @selfxyz/qrcode
```

- `viem@2.x` — Ethereum TypeScript library (signature verification, ENS resolution, address checksumming). Used server-side AND client-side.
- `siwe@2.x` — SIWE message parsing/verification (server-side only)
- `@selfxyz/core` + `@selfxyz/qrcode` — Self Protocol verification

**NOT installing:** `wagmi`, `@tanstack/react-query`, `@reown/appkit`. For SIWE-only auth, raw `viem` + a custom EIP-6963 hook is sufficient and saves ~150KB of client bundle. wagmi can be added later if on-chain reads are needed.

### 0B. Prisma Migration

**File: `prisma/schema.prisma`**

```prisma
model User {
  email         String?   @unique  // WAS: String @unique (required → optional)
  walletAddress String?   @unique  // NEW: checksummed EIP-55 address
  ensName       String?            // NEW: cached ENS primary name
  // ... rest unchanged
}

model Floor {
  requiredSelfPassId String?       // NEW: Self Protocol VC ID for gated access
  // ... rest unchanged
}

model MemberFloorMembership {
  accessSource  String?            // NEW: "INVITATION" | "SELF_PROOF" | "DEV_AUTO"
  // ... rest unchanged
}
```

Run: `pnpm prisma migrate dev --name web3_wallet_and_floor_gating`

Non-destructive: making email optional + adding nullable columns preserves all existing data.

**Convention:** `walletAddress` must always be stored checksummed via `viem.getAddress()`. PostgreSQL `@unique` is case-sensitive — unchecksummed addresses risk duplicate User records.

### 0C. Address Checksumming Utility

**New: `lib/web3/address.ts`**
```typescript
import { getAddress } from "viem"
export function checksumAddress(address: string): string {
  return getAddress(address)
}
```

Used at every boundary where an address enters the system: SIWE authorize, ENS service, Self Protocol verify.

### 0D. Secret Hygiene

**Modify: `.gitignore`** — add `*.key`, `*.pem`

**Modify: `.env.example`** — add:
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # Optional: Reown dashboard project ID
ETHEREUM_RPC_URL=                        # Server-side mainnet RPC (NEVER prefix NEXT_PUBLIC_)
SELF_APP_ID=                             # Self Protocol developer portal
SELF_MOCK=true                           # Set false for real Self verification
ADMIN_WALLETS=                           # Comma-separated checksummed addresses
```

---

## 4. Phase 1: Wallet Auth via SIWE (~6 hours)

**Goal:** Wallet-first sign-in. Primary demo for Moonpay OpenWallet prize track.

### 1A. SIWE Utilities (Server-Side)

**New: `lib/web3/siwe.ts`**
- `generateNonce()` — `crypto.randomUUID()`, set as httpOnly cookie with 5-min TTL, SameSite=Strict, Secure
- `verifySiweMessage(message, signature, expectedNonce)` — parse via `siwe` lib, validate nonce match + expiration + domain, verify via `viem.verifyMessage()`, return checksummed address
- Delete nonce cookie after use (one-time, prevents replay)

No database nonce table. The cookie IS the nonce store. Expires automatically.

### 1B. Nonce Endpoint

**New: `app/api/auth/siwe/nonce/route.ts`**
```
GET /api/auth/siwe/nonce
→ Set-Cookie: siwe-nonce=<uuid>; HttpOnly; SameSite=Strict; Secure; Max-Age=300; Path=/
→ 200 { nonce: "<uuid>" }
```

### 1C. SIWE Credentials Provider

**Modify: `lib/auth.ts`**

Key changes:
1. **Add SIWE Credentials provider** (always available, both dev and prod):
```typescript
Credentials({
  id: "siwe",
  credentials: { message: { type: "text" }, signature: { type: "text" } },
  async authorize(credentials, request) {
    // 1. Read nonce from httpOnly cookie
    // 2. verifySiweMessage(message, signature, nonce)
    // 3. checksumAddress(address)
    // 4. Find or create User by walletAddress
    // 5. Resolve ENS name (best-effort, non-blocking)
    // 6. Return { id, email, walletAddress, ensName, name }
  },
})
```

2. **Give existing dev Credentials provider explicit `id: "dev-login"`** (currently defaults to "credentials")

3. **Switch session strategy to JWT-only:** `session: { strategy: "jwt" }` (was `isDev ? "jwt" : "database"`). Required because Credentials providers need JWT in NextAuth v5.

4. **Expand Session type:**
```typescript
interface Session {
  user: {
    id: string
    memberId: string | null
    email: string | null        // WAS: string (now nullable for wallet users)
    walletAddress: string | null // NEW
    ensName: string | null       // NEW
    name?: string | null
    image?: string | null
  }
}
```

5. **Update JWT callback** to persist `walletAddress` + `ensName` on token
6. **Update session callback** to expose them on `session.user` (always use `token.id`, remove `isDev` branch)

### 1D. Sign-In Page

**Modify: `app/auth/signin/page.tsx`**

Layout (top to bottom):
1. Title: "Sign in to Frontier Atlas"
2. **`<WalletConnectButton />`** — primary CTA, visually prominent
3. `── or ──` divider
4. Email form (existing, slightly de-emphasized)
5. Change dev `signIn("credentials", ...)` to `signIn("dev-login", ...)`

### 1E. Wallet Connect Button

**New: `components/wallet-connect-button.tsx`**

Four-state UX (per ethskills Frontend UX):

| State | Button Text | Action |
|-------|------------|--------|
| Disconnected | "Connect Wallet" | EIP-6963 discovery → connect |
| Connected, wrong chain | "Switch to Ethereum" | Request chain switch |
| Connected, correct chain | "Sign in with Ethereum" | Fetch nonce → SIWE sign → `signIn("siwe")` |
| Signing | "Signing..." (disabled) | Spinner, waiting for wallet |

Error translation (inline text below button, not raw exceptions):
- MetaMask `code: 4001` → "You declined the signature request."
- `code: -32002` → "Please check your wallet — a request is pending."
- Network errors → "Could not connect to your wallet. Please try again."

### 1F. EIP-6963 Discovery Hook

**New: `hooks/use-wallet-providers.ts`**

Listens for `eip6963:announceProvider` events, dispatches `eip6963:requestProvider`. Returns discovered wallet providers with `{ info: EIP6963ProviderInfo, provider: EIP1193Provider }`. Falls back to `window.ethereum` if no EIP-6963 providers announce within 500ms.

This is the specific requirement for the **Moonpay OpenWallet Standard** prize track — standard-compliant wallet discovery without hardcoded connectors.

### 1G. Auth Helper Modifications

**Modify: `lib/auth-helpers.ts`** — `requireAuth()` accepts wallet OR email:
```typescript
if (!session.user.email && !session.user.walletAddress) {
  throw new AppError("UNAUTHORIZED", "No identity associated with account")
}
```

**Modify: `lib/admin-auth.ts`** — Add `ADMIN_WALLETS` env var:
```typescript
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS ?? "")
  .split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)

// Check: emailMatch OR walletMatch
```

**Modify: `app/admin/layout.tsx`** — Three changes:
- Line 18: `if (!session?.user?.id)` instead of `if (!session?.user?.email)`
- Lines 22-28: Add ADMIN_WALLETS parallel check
- Line 56: Display `email ?? ensName ?? truncatedAddress`

**Modify: `lib/telegram/dual-auth.ts`** — Line 22:
```typescript
if (session?.user?.id && (session.user.email || session.user.walletAddress)) {
```

**Modify: `app/api/invitations/claim/route.ts`** — Guard null email:
```typescript
if (!user.email) throw new AppError("FORBIDDEN", "Email required to claim invitations")
```

### 1H. No Changes Needed
- `middleware.ts` — route matcher doesn't affect SIWE endpoints
- `lib/auth.config.ts` — authorized callback checks `auth?.user`, not email
- `lib/floor-lead-auth.ts` — checks `memberId`, not email
- `app/providers.tsx` — no WagmiProvider needed (using raw viem)

---

## 5. Phase 2: ENS Identity (~3 hours)

**Goal:** Auto-populate onboarding from ENS. Primary demo for ENS prize track.

### 2A. ENS Resolution Service

**New: `lib/web3/ens-service.ts`**

```typescript
interface EnsProfile {
  name: string | null        // ENS primary name
  avatar: string | null      // avatar record
  description: string | null // description text record
  url: string | null         // url text record
  github: string | null      // com.github
  twitter: string | null     // com.twitter
}

async function resolveEnsProfile(address: string): Promise<EnsProfile>
```

- Uses `viem` public client with `ETHEREUM_RPC_URL` (server-side only)
- `Promise.allSettled()` for parallel resolution of all text records
- Each rejected promise maps to `null` (graceful degradation)

### 2B. ENS During SIWE Auth

Already integrated in Phase 1C — the SIWE `authorize()` callback calls `resolveEnsProfile()` after wallet verification, caches `ensName` on User record, sets `user.name` and `user.image` from ENS.

### 2C. ENS Profile Endpoint

**New: `app/api/ens/[addressOrName]/route.ts`**
```
GET /api/ens/vitalik.eth
GET /api/ens/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
→ 200 { success: true, data: EnsProfile }
```

Public endpoint (ENS data is public blockchain data). Used by onboarding flow.

### 2D. Onboarding Pre-Population

**Modify: `components/onboarding-flow.tsx`**

- Add prop `walletAddress?: string`
- On mount when `open` becomes true + walletAddress provided: fetch `GET /api/ens/${walletAddress}`
- Pre-fill **only empty fields** (never overwrite user-edited data):

| ENS Record | Onboarding Field | Condition |
|-----------|-----------------|-----------|
| `name` | `fullName` | Only if empty |
| `avatar` | photo slot | Only if no photo |
| `description` | `oneLineIntro` | Only if empty |
| `url` | `websiteUrl` | Only if empty |

- Show toast via `sonner`: "Pre-filled from your ENS profile"
- Display ENS avatar in photo slot at step 1

### 2E. Address Display Component

**New: `components/address-display.tsx`**

Per ethskills Frontend UX rule 3:
- ENS name if available, otherwise truncated checksummed address (`0x1234...5678`)
- Etherscan explorer link (opens new tab)
- Copy-to-clipboard with checkmark transition
- Blockie/gradient avatar when no ENS avatar
- Uses existing shadcn `Button` (ghost), `Tooltip`, lucide icons

**Modify: `app/page.tsx` top bar** — For wallet users, use `<AddressDisplay>` where email/name would appear.

---

## 6. Phase 3: Self Protocol Floor Access (~3 hours)

**Goal:** VC-gated floor access for Floor 12. Primary demo for Self Protocol prize track.

### 3A. Self Protocol Service

**New: `lib/web3/self-service.ts`**

```typescript
async function verifySelfPresentation(
  proof: string,
  requiredPassId: string
): Promise<{ valid: boolean; address?: string }>
```

- Uses `@selfxyz/core` server-side SDK configured with `SELF_APP_ID`
- **Mock fallback:** If `SELF_MOCK=true`, skip real verification → `{ valid: true, address: "0x..." }` (critical for demo if SDK has issues)

### 3B. Floor Verification Endpoint

**New: `app/api/floors/[floorId]/verify-pass/route.ts`**

```
POST /api/floors/{floorId}/verify-pass
Body: { proof: "..." }
→ 200 { memberId, floorId, membershipStatus: "active" }
```

Logic (replicates `claimInvitation` pattern from `lib/services/invitation-service.ts`):
1. `requireAuth()` — must be signed in
2. Load floor → check `requiredSelfPassId` exists
3. `verifySelfPresentation(proof, requiredSelfPassId)`
4. Prisma transaction:
   - Find or create Member (fullName: `ensName ?? email?.split("@")[0] ?? "Anonymous"`)
   - Upsert MemberFloorMembership (ACTIVE, MEMBER, accessSource: `"SELF_PROOF"`)
   - Upsert MemberProfile (DRAFT, homeFloorId = floorId only if no existing profile)

### 3C. Floor Access Helper

**New: `lib/floor-access.ts`**

```typescript
async function requireFloorAccess(request: NextRequest, floorId: string)
```

- Load floor with `requiredSelfPassId`
- If null → legacy floor, pass through (existing auth sufficient)
- If set → `requireEitherMember(request)`, then verify active MemberFloorMembership for this floor
- Throw `AppError("FORBIDDEN", "Floor access required. Complete verification to join.")` if no membership

### 3D. Route Gating

Add `requireFloorAccess(request, floorId)` to these routes for gated floors:

| Route | Current Auth | Change |
|-------|-------------|--------|
| `GET /api/floors/[floorId]` | Public | Public — add `isGated` + `userHasMembership` to response |
| `GET /api/floors/[floorId]/leads` | requireEitherAuth | + requireFloorAccess |
| `GET /api/floors/[floorId]/people` | requireEitherMember | + requireFloorAccess |
| `GET /api/floors/[floorId]/events` | Public | + requireFloorAccess for gated floors |
| `GET /api/floors/[floorId]/pulse` | Public | + requireFloorAccess for gated floors |
| `GET /api/floors/[floorId]/onboarding-stats` | requireEitherAuth | + requireFloorAccess |
| `POST .../send-onboarding-email` | requireFloorLead | No change |

### 3E. Self Verify Modal

**New: `components/self-verify-modal.tsx`**

Using existing shadcn `Dialog`:
- Header: "Verify to join Floor {number} — {name}"
- Body: Self Protocol QR code from `@selfxyz/qrcode`
- States: idle (QR) → verifying (spinner) → success (checkmark, auto-close 2s) → error (retry)
- Polling: after QR display, poll `GET /api/floors/{floorId}` every 2s checking `userHasMembership`

### 3F. Floor Bento Locked State

**Modify: `components/floor-bento.tsx`**

For `isGated && !userHasAccess`:
- Card A (floor identity): renders normally (public info)
- Cards B-E: `blur-sm opacity-50 pointer-events-none` with overlay:
  - Lock icon (lucide `Lock`)
  - "This floor requires verification to access"
  - CTA: "Verify with Self Protocol" → opens SelfVerifyModal
- **Transition:** when `userHasAccess` flips true → 500ms CSS blur-fade-out, staggered card fade-in
- Skip API calls for locked floor data (would 403 anyway); re-trigger on unlock

### 3G. Seed Data

**Modify: `lib/floor-data.ts`** — Add `requiredSelfPassId` to FloorDefinition type; set `"self-humanity-check"` on floor-12

**Modify: `prisma/seed.ts`** — Map `requiredSelfPassId` in floor upsert

---

## 7. File Inventory

### New Files (12)

| File | Purpose |
|------|---------|
| `lib/web3/address.ts` | `checksumAddress()` wrapping `viem.getAddress()` |
| `lib/web3/siwe.ts` | SIWE nonce generation + message verification |
| `lib/web3/ens-service.ts` | ENS text record resolution via viem |
| `lib/web3/self-service.ts` | Self Protocol VC verification + mock fallback |
| `lib/floor-access.ts` | `requireFloorAccess()` helper for gated routes |
| `app/api/auth/siwe/nonce/route.ts` | Nonce generation + httpOnly cookie |
| `app/api/ens/[addressOrName]/route.ts` | Public ENS profile resolution |
| `app/api/floors/[floorId]/verify-pass/route.ts` | Self Protocol floor verification |
| `components/wallet-connect-button.tsx` | Four-state wallet connect + SIWE sign-in |
| `components/self-verify-modal.tsx` | Self Protocol QR verification dialog |
| `components/address-display.tsx` | ENS-aware address display (truncation, explorer, copy) |
| `hooks/use-wallet-providers.ts` | EIP-6963 wallet provider discovery |

### Modified Files (16)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | email optional; add walletAddress, ensName, requiredSelfPassId, accessSource |
| `lib/auth.ts` | SIWE provider, JWT-only, expanded session type, updated callbacks |
| `lib/auth-helpers.ts` | Accept walletAddress OR email in `requireAuth()` |
| `lib/admin-auth.ts` | Add ADMIN_WALLETS check alongside ADMIN_EMAILS |
| `lib/telegram/dual-auth.ts` | Accept wallet sessions (line 22) |
| `app/admin/layout.tsx` | Dual identity check + wallet/ENS display |
| `app/auth/signin/page.tsx` | Add WalletConnectButton + "or" divider; dev signIn → "dev-login" |
| `app/api/invitations/claim/route.ts` | Guard null email before claimInvitation |
| `components/onboarding-flow.tsx` | ENS pre-population from wallet address |
| `components/floor-bento.tsx` | Locked/blurred state for gated floors |
| `app/page.tsx` | Pass gating info to FloorBento; pass walletAddress to onboarding |
| `app/api/floors/[floorId]/route.ts` | Add isGated + userHasMembership to response |
| `app/api/floors/[floorId]/leads/route.ts` | Add requireFloorAccess |
| `app/api/floors/[floorId]/people/route.ts` | Add requireFloorAccess |
| `app/api/floors/[floorId]/pulse/route.ts` | Add requireFloorAccess |
| `app/api/floors/[floorId]/events/route.ts` | Add requireFloorAccess |
| `app/api/floors/[floorId]/onboarding-stats/route.ts` | Add requireFloorAccess |
| `lib/floor-data.ts` | Add requiredSelfPassId to type + floor-12 data |
| `prisma/seed.ts` | Map requiredSelfPassId in upsert |
| `.env.example` | Add Web3 env vars |
| `.gitignore` | Add *.key, *.pem |

---

## 8. Error Handling

| Scenario | What Goes Wrong | Recovery |
|----------|----------------|----------|
| Wallet Connection | User rejects EIP-6963/MetaMask prompt | Inline: "Wallet connection required." Fallback to email sign-in. |
| SIWE Signature | User rejects signature in wallet | Inline: "You declined the signature request." Retry button. |
| Chain Mismatch | Connected to wrong network | Button: "Switch to Ethereum". Auto-prompt chain switch. |
| Nonce Expired | User takes >5 min to sign | Inline: "Session expired. Please try again." Auto-fetch new nonce. |
| ENS Resolution | RPC rate limit or no ENS name | Graceful degradation. Use raw address as name. Onboarding fields stay empty. |
| Self Pass Invalid | User doesn't hold required VC | Modal: explain what's needed + link to mint Self Pass. |
| Self SDK Down | Self Protocol service unavailable | Mock mode (`SELF_MOCK=true`): "Simulate Verification" button. |

---

## 9. Cut Priorities (If Time Runs Short)

| Priority | What to Cut | Time Saved | Impact |
|----------|------------|------------|--------|
| 1st | Real Self QR (`@selfxyz/qrcode`) → "Simulate Verification" button | ~2-3 hr | Locked→unlocked transition still demos perfectly |
| 2nd | AddressDisplay component → plain text ENS/address | ~1 hr | Minor visual reduction |
| 3rd | ENS avatar resolution → keep name/description/url only | ~30 min | Photo slot stays empty |
| 4th | Per-route gating for events/pulse → only gate /people and /leads | ~30 min | Bento locked state blocks UI regardless |
| 5th | ENS during SIWE auth → resolve lazily in onboarding only | ~30 min | Slightly slower onboarding pre-fill |
| **NEVER** | **Wallet auth (Phase 1)** | — | Everything depends on it |
| **NEVER** | **Locked floor bento state** | — | Visual centerpiece of Self demo |
| **NEVER** | **ENS onboarding pre-population** | — | Visual centerpiece of ENS demo |

---

## 10. Build Sequence

```
Phase 0 (Foundation)
  ├─ 0B. prisma migrate (schema changes)
  ├─ 0A. pnpm add viem siwe @selfxyz/core @selfxyz/qrcode
  ├─ 0C. lib/web3/address.ts
  └─ 0D. .env.example + .gitignore

Phase 1 (Wallet Auth) — depends on Phase 0
  ├─ 1A. lib/web3/siwe.ts
  ├─ 1C. lib/auth.ts (SIWE provider + JWT-only + session expansion)
  ├─ 1G. Auth helper fixes (all 5 files)
  ├─ 1B. app/api/auth/siwe/nonce/route.ts
  ├─ 1F. hooks/use-wallet-providers.ts
  ├─ 1E. components/wallet-connect-button.tsx
  └─ 1D. app/auth/signin/page.tsx

Phase 2 (ENS) — depends on Phase 1
  ├─ 2A. lib/web3/ens-service.ts
  ├─ 2C. app/api/ens/[addressOrName]/route.ts
  ├─ 2D. components/onboarding-flow.tsx (ENS pre-fill)
  └─ 2E. components/address-display.tsx

Phase 3 (Self Protocol) — depends on Phase 0, can parallel Phase 2
  ├─ 3A. lib/web3/self-service.ts
  ├─ 3B. app/api/floors/[floorId]/verify-pass/route.ts
  ├─ 3C. lib/floor-access.ts
  ├─ 3D. Route gating (5 floor sub-routes)
  ├─ 3G. Seed data (floor-data.ts + seed.ts)
  ├─ 3E. components/self-verify-modal.tsx
  └─ 3F. components/floor-bento.tsx (locked state)
```

**Phase 1G** (auth helper fixes) can be tested with existing email auth — run regression tests before building wallet UI.

**Phases 2 and 3** are independent — develop in parallel for maximum velocity.

---

## 11. Environment Variables

```bash
# Web3 — Required
ETHEREUM_RPC_URL=                        # Server-side mainnet RPC (Alchemy/Infura)
SELF_APP_ID=                             # Self Protocol developer portal

# Web3 — Optional
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=    # Reown dashboard (safe to expose)
ADMIN_WALLETS=                           # Comma-separated checksummed addresses
SELF_MOCK=true                           # Mock Self verification for dev/demo

# Existing — Preserved
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_URL=
ADMIN_EMAILS=
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=
TELEGRAM_BOT_TOKEN=
```

**Security note:** `ETHEREUM_RPC_URL` is server-side only. Client-side viem uses the user's injected wallet provider for signing — no RPC URL needed. **Never prefix with `NEXT_PUBLIC_`.**

---

## 12. Why This Approach

| Feature | Our Approach | Alternative | Why Ours Wins |
|---------|-------------|-------------|---------------|
| **Wallet Discovery** | EIP-6963 via custom hook | Full wagmi + @reown/appkit | ~150KB smaller bundle; sufficient for SIWE-only; satisfies Moonpay prize |
| **Auth Architecture** | SIWE as NextAuth Credentials | Separate wallet-link flow | More impressive demo (wallet-first); fewer models; simpler UX |
| **Nonce Management** | httpOnly cookie, 5-min TTL | Database challenge table | No cleanup cron; no extra model; standard SIWE pattern |
| **Data Model** | walletAddress on User | Separate WalletAccount model | Fewer migrations; wallet IS the identity, not a linked sub-account |
| **ENS Profiles** | Server-side resolution via viem | Client-side wagmi hooks | No API key leak; cached on User; works without wallet connected |
| **Floor Gating** | requiredSelfPassId null check | FloorAccessMode enum | Self-documenting; no enum migration |
| **Access Control** | Self Protocol VCs | ERC20/ERC721 token gating | Sybil-resistant; privacy-preserving; no token purchase needed |

---

## 13. Acceptance Criteria

### Wallet Auth
- [ ] `/auth/signin` shows "Connect Wallet" button above email form
- [ ] Click → EIP-6963 discovers browser wallets (MetaMask, Moonpay, etc.)
- [ ] Connect + sign SIWE → redirected to home with session
- [ ] Session contains `walletAddress` and `ensName` (if address has ENS)
- [ ] Existing email sign-in still works (dev + prod)
- [ ] Existing Telegram auth still works
- [ ] Admin access works for wallet users (via ADMIN_WALLETS)
- [ ] Invitation claiming rejects wallet-only users with clear message

### ENS Identity
- [ ] Sign in with ENS wallet → session shows ENS name
- [ ] Open onboarding → fields pre-populated from ENS (only empty fields)
- [ ] ENS avatar displays in photo slot at step 1
- [ ] Users without ENS see empty fields, proceed normally
- [ ] Publishing profile works for wallet users

### Self Protocol
- [ ] Navigate to Floor 12 → locked/blurred state visible
- [ ] Click "Verify with Self Protocol" → QR modal (or mock button)
- [ ] Complete verification → membership created
- [ ] Floor unlocks with smooth blur-fade transition
- [ ] Gated floor routes return 403 for non-members
- [ ] Legacy floors (1-11, 14-16) behave exactly as before
- [ ] Self proof is idempotent (re-verification doesn't duplicate rows)

### Regression
- [ ] Email sign-in still works
- [ ] Invitation claim still works (for email users)
- [ ] Telegram linking still works
- [ ] Admin email authorization still works
- [ ] Dev auto-create flow still works

---

## 14. Pitfalls & Mitigations

| Risk | Mitigation |
|------|------------|
| NextAuth v5 beta Credentials quirks | JWT-only; test authorize→jwt→session chain first |
| SIWE nonce cookie issues | httpOnly + SameSite=Strict + Secure; same-origin |
| ENS resolution latency (6+ RPC calls) | `Promise.allSettled()` parallel; cache on User; resolve once at sign-in |
| Self Protocol SDK immaturity | Mock fallback (`SELF_MOCK=true`); register dev access Day 0 |
| Making email optional breaks queries | All 5 `session.user.email` locations addressed in Phase 1G |
| Unchecksummed addresses → duplicate Users | `checksumAddress()` at every DB write boundary |
| JWT cookie size (~4KB limit) | Don't store ENS avatar URL in JWT; resolve at render time |
| JWT sessions can't be revoked server-side | Acceptable for hackathon; sessions expire with JWT TTL |
| EIP-6963 demo without Moonpay wallet | Install Moonpay extension on demo machine; hook discovers all wallets |
| Existing sessions invalidated by JWT switch | Acceptable; all users re-sign-in once |
| Wallet+email account merging | Out of scope for hackathon; separate User records |
