# Web3 Transition Plan: Moonpay OpenWallet + ENS Identity + Self Protocol

## Context

Frontier Atlas is a community platform built on Next.js 16 / NextAuth v5 / Prisma 7.5 / PostgreSQL. It currently uses email magic links for auth, admin-generated invitation tokens for floor access, and manual profile entry during a 10-step onboarding wizard. We're transitioning to Web3 for a hackathon targeting three prize tracks: **Moonpay OpenWallet**, **ENS Identity**, and **Self Protocol**. The existing architecture is exceptionally well-structured for this — clean service layer, dual-auth pattern (web + Telegram), and self-contained invitation flow make this mostly surgical.

> **Reviewed against [ethskills.com](https://ethskills.com) best practices** — wallets, frontend UX, security, standards, ship, and concepts modules. Corrections integrated below.

---

## Phase 0: Foundation (~1 hour)

### 0A. Install dependencies

```bash
pnpm add wagmi viem @tanstack/react-query siwe @reown/appkit @selfxyz/core @selfxyz/qrcode
```

- `wagmi@2.x` + `viem@2.x` — Ethereum React hooks + low-level client
- `@tanstack/react-query@5.x` — wagmi peer dep
- `siwe@2.x` — SIWE message parsing/verification
- `@reown/appkit@1.x` — connect modal with EIP-6963 wallet discovery (satisfies Moonpay OpenWallet Standard)
- `@selfxyz/core` + `@selfxyz/qrcode` — Self Protocol VC verification

### 0B. Prisma migration

**File: `prisma/schema.prisma`**

```prisma
model User {
  email         String?   @unique  // was required, now optional
  walletAddress String?   @unique  // NEW: primary identifier for wallet users
  ensName       String?            // NEW: cached ENS primary name
  // ... rest unchanged
}

model Floor {
  requiredSelfPassId String?       // NEW: Self Protocol VC ID for gated access
  // ... rest unchanged
}
```

Run: `pnpm prisma migrate dev --name add_wallet_and_self_fields`

This is non-destructive — making email optional and adding nullable columns preserves all existing data.

**Convention:** `walletAddress` must always be stored **checksummed** via `viem.getAddress()`. Every code path that writes a walletAddress to the DB must checksum first. PostgreSQL `@unique` is case-sensitive, so unchecksummed addresses risk duplicate User records.

### 0C. Utility: Address checksumming

**New: `lib/web3/address.ts`**
- Export `checksumAddress(address: string): string` wrapping `getAddress()` from viem
- Used in: SIWE authorize, ENS service, Self Protocol service — every boundary where an address enters the system

### 0D. Secret hygiene

**Modify: `.gitignore`** — add `*.key` and `*.pem` (per ethskills wallets module)

**Modify: `.env.example`** — add Web3 env vars with placeholder values (never real keys)

---

## Phase 1: Wallet Auth via SIWE (~8 hours)

**Goal:** Replace email magic links with wallet signatures. Primary demo for Moonpay OpenWallet prize track.

### 1A. Web3 provider configuration

**New: `lib/web3/config.ts`**
- wagmi config with mainnet chain, WalletConnect projectId, EIP-6963 wallet discovery
- **Client-side RPC: use viem's built-in `http()` public transport** (no API key). Do NOT use `NEXT_PUBLIC_RPC_URL` with an Alchemy/Infura key — the `NEXT_PUBLIC_` prefix ships the key to every browser. Per ethskills: "RPC URLs with embedded credentials" are at-risk secrets.
- Server-side ENS resolution uses `ETHEREUM_RPC_URL` (private, never exposed to client)

**New: `lib/web3/provider.tsx`**
- Client component wrapping `WagmiProvider` + `QueryClientProvider` + AppKit context

**Modify: `app/providers.tsx`**
- Nest `<Web3Provider>` inside existing `<SessionProvider>`

### 1B. SIWE auth flow (server-side)

**New: `lib/web3/siwe.ts`**
- `generateNonce()` — crypto random, stored as httpOnly cookie **with 5-minute expiration**
- `verifySiweMessage(message, signature)` — parse + verify via `siwe` library
- **Must validate:** nonce matches cookie, cookie not expired, SIWE `expirationTime` field if present, `issuedAt` is recent
- **Must delete** nonce cookie after use (one-time use, prevents replay)

**New: `app/api/auth/siwe/nonce/route.ts`**
- GET: generate nonce, set `siwe-nonce` httpOnly cookie, return nonce

**Modify: `lib/auth.ts`** (the critical file)

Key changes:
1. **Add SIWE Credentials provider** alongside existing providers:
   ```typescript
   Credentials({
     id: "siwe",
     credentials: { message: { type: "text" }, signature: { type: "text" } },
     async authorize(credentials) {
       // verify SIWE signature
       // → checksumAddress(address) via viem.getAddress() BEFORE any DB lookup
       // → find/create User by checksummed walletAddress
       // → resolve ENS → return user
     },
   })
   ```
2. **Give existing dev Credentials provider explicit `id: "credentials"`** to avoid collision
3. **Switch session strategy to JWT always** (was `isDev ? "jwt" : "database"`). Required because Credentials providers need JWT. Acceptable trade-off for hackathon.
4. **Extend Session type**:
   ```typescript
   interface Session { user: { id, memberId, email?, walletAddress?, ensName?, name?, image? } }
   ```
5. **Update JWT callback** to persist walletAddress + ensName on token
6. **Update session callback** to expose walletAddress + ensName on session.user

### 1C. Sign-in page

**Modify: `app/auth/signin/page.tsx`**
- Add prominent "Connect Wallet" button (primary CTA) above existing email form
- "or" divider between wallet and email options
- Wallet flow: connect → fetch nonce → construct SIWE message → sign → `signIn("siwe", {...})`

**New: `components/wallet-connect-button.tsx`**
- Encapsulates connect + SIWE flow using wagmi hooks (`useAccount`, `useSignMessage`, `useChainId`, `useSwitchChain`)
- Reusable in other pages (e.g., top bar for logged-out users)
- **Must implement four-state action flow** (per ethskills Frontend UX rule 1):
  1. `!isConnected` → render "Connect Wallet"
  2. `chainId !== mainnet.id` → render "Switch to Ethereum"
  3. Connected + correct chain → render "Sign In with Ethereum" (triggers SIWE)
  4. Each state has its own pending boolean: `isConnecting`, `isSwitching`, `isSigning` — no shared `isLoading`
- **Must translate wallet errors** to human-readable messages (per ethskills Frontend UX rule 4):
  - MetaMask `code: 4001` → "You declined the signature request."
  - `code: -32002` → "Please check your wallet — a request is pending."
  - Network errors → "Could not connect to your wallet. Please try again."
  - Display as inline error text below button, not raw exceptions

### 1D. Auth helpers

**Modify: `lib/auth-helpers.ts`**
- `requireAuth()`: accept `walletAddress` as alternative to `email` (line 9 currently throws if no email)

**Modify: `lib/telegram/dual-auth.ts`**
- `requireEitherAuth()`: accept `walletAddress` in session check (line 22 currently checks email)

**Modify: `lib/admin-auth.ts`** (MISSED IN ORIGINAL PLAN — breaks admin for wallet users)
- Line 11: `if (!session?.user?.email)` silently rejects wallet-only admins
- Add `ADMIN_WALLETS` env var. Check either `session.user.email` against `ADMIN_EMAILS` or `session.user.walletAddress` against `ADMIN_WALLETS`.

**Modify: `app/admin/layout.tsx`** (MISSED IN ORIGINAL PLAN)
- Line 18: `if (!session?.user?.email)` redirects wallet admins away
- Line 27: `adminEmails.includes(session.user.email.toLowerCase())` breaks for wallet users
- Line 56: `{session.user.email}` in sidebar — display `email ?? ensName ?? truncatedAddress`
- Apply same dual-check as `lib/admin-auth.ts`

### 1E. No changes needed

- `middleware.ts` — already works with JWT sessions
- `lib/auth.config.ts` — `authorized` callback checks `auth?.user` regardless of auth method
- `lib/services/invitation-service.ts` — email invitation flow stays for email users; wallet users use Self Protocol (Phase 3)

### 1F. Verification

1. Visit `/auth/signin` — "Connect Wallet" button visible
2. Click → AppKit modal shows wallets (EIP-6963 auto-discovery)
3. Connect + sign SIWE message → redirected to home with session
4. Session contains `walletAddress` and `ensName` (if address has ENS)
5. Existing email sign-in still works
6. Telegram auth still works

---

## Phase 2: ENS Identity Auto-Population (~4 hours)

**Goal:** Auto-populate profiles from ENS text records. Primary demo for ENS prize track.

### 2A. ENS resolution service

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
```

- `resolveEnsProfile(address)` — uses viem's `getEnsName()`, `getEnsAvatar()`, `getEnsText()` in parallel via `Promise.allSettled()`
- Requires `ETHEREUM_RPC_URL` env var (mainnet RPC)

### 2B. ENS sync during SIWE auth

**Already in `lib/auth.ts` SIWE authorize function (Phase 1B)**
- After find/create User by walletAddress, call `resolveEnsProfile()`
- Cache `ensName` on User record, set `user.name` and `user.image` from ENS

### 2C. ENS profile API endpoint

**New: `app/api/me/ens-profile/route.ts`**
- GET: `requireAuth()` → resolve ENS for current user's walletAddress → return mapped profile fields
- Maps: `name` → `fullName`, `description` → `oneLineIntro`, `url` → `websiteUrl`, `avatar` → `avatarUrl`

### 2D. Onboarding flow pre-population

**Modify: `components/onboarding-flow.tsx`**
- On mount (when `open` becomes true and no existing profile data), fetch `GET /api/me/ens-profile`
- Pre-fill form fields from response
- Show toast: "We found your ENS profile! Fields have been pre-filled."
- Display ENS avatar in photo slot at step 1

### 2E. Address display component + ENS name in UI

**New: `components/address-display.tsx`**
Per ethskills Frontend UX rule 3, displayed addresses must have:
- ENS name if available, otherwise truncated checksummed address
- Etherscan explorer link (`https://etherscan.io/address/${address}`)
- Copy-to-clipboard on click
- Blockie/gradient avatar when no ENS avatar exists

**Modify: `app/page.tsx` top bar area**
- For wallet users, use `<AddressDisplay>` component where email/name would appear

### 2F. Verification

1. Sign in with wallet that has ENS text records
2. Session shows ENS name
3. Open onboarding → fields pre-populated from ENS
4. Avatar displays ENS avatar
5. Publishing profile works normally
6. Users without ENS see empty fields, proceed normally

---

## Phase 3: Self Protocol Floor Access (~4 hours)

**Goal:** Replace invitation tokens with VC-gated floor access. Primary demo for Self Protocol prize track.

### 3A. Self Protocol verification service

**New: `lib/web3/self-service.ts`**
- `verifySelfPresentation(proof, requiredPassId)` → `{ valid: boolean; address?: string }`
- Uses `@selfxyz/core` SDK server-side

### 3B. Floor verification endpoint

**New: `app/api/floors/[floorId]/verify-pass/route.ts`**
- POST: `requireAuth()` → load Floor → check `requiredSelfPassId` → verify proof → create Member + MemberFloorMembership + MemberProfile (same pattern as `claimInvitation`)
- Effectively replaces invitation flow for VC-gated floors
- **Member.fullName fallback for wallet users:** use `ensName` if available, else truncated checksummed address (mirrors `claimInvitation`'s `userEmail.split("@")[0]` pattern)

### 3C. Seed data

**Modify: `prisma/seed.ts` or floor data**
- Set `requiredSelfPassId` on floor-12 (Ethereum & Decentralized Tech) for demo

### 3D. Self Protocol verification UI

**New: `components/self-verify-modal.tsx`**
- Dialog with floor name, "This floor requires verification" message
- Self Protocol QR code from `@selfxyz/qrcode`
- Loading/success states after verification

### 3E. Floor bento gating

**Modify: `components/floor-bento.tsx`**
- For floors with `requiredSelfPassId`: show locked/blurred state if user has no membership
- "Verify to Join" button opens `SelfVerifyModal`
- After verification, refresh and show unlocked state

**Modify: Floor API response** (`app/api/floors/[floorId]/route.ts`)
- Include `requiredSelfPassId` and `userHasMembership` in response

### 3F. Verification

1. Navigate to gated floor → locked state visible
2. Click "Verify to Join" → Self Protocol QR appears
3. Scan with Self app → proof submitted → membership created
4. Floor unlocks, bento grid renders normally

---

## New Files Summary (14)

| File | Purpose |
|------|---------|
| `lib/web3/config.ts` | wagmi config, EIP-6963, WalletConnect (public RPC only) |
| `lib/web3/provider.tsx` | WagmiProvider + QueryClient wrapper |
| `lib/web3/address.ts` | `checksumAddress()` utility wrapping `viem.getAddress()` |
| `lib/web3/siwe.ts` | Server-side SIWE nonce + verification + expiration |
| `lib/web3/ens-service.ts` | ENS text record resolution via viem |
| `lib/web3/self-service.ts` | Self Protocol VC verification |
| `app/api/auth/siwe/nonce/route.ts` | Nonce generation endpoint |
| `app/api/me/ens-profile/route.ts` | ENS profile data for current user |
| `app/api/floors/[floorId]/verify-pass/route.ts` | Self Protocol floor verification |
| `components/wallet-connect-button.tsx` | Four-state wallet connect + SIWE sign-in |
| `components/address-display.tsx` | Reusable address display (ENS, truncation, explorer link, copy) |
| `components/self-verify-modal.tsx` | Self Protocol QR verification dialog |

## Modified Files Summary (15)

| File | Change |
|------|--------|
| `package.json` | Add Web3 dependencies |
| `prisma/schema.prisma` | email optional, add walletAddress/ensName/requiredSelfPassId |
| `lib/auth.ts` | SIWE provider, JWT-only sessions, address checksumming, extended session type |
| `lib/auth-helpers.ts` | Accept walletAddress in `requireAuth()` |
| `lib/telegram/dual-auth.ts` | Accept walletAddress in session check |
| `lib/admin-auth.ts` | **NEW** Dual-check: ADMIN_EMAILS or ADMIN_WALLETS |
| `app/admin/layout.tsx` | **NEW** Wallet-compatible admin check + display |
| `app/providers.tsx` | Wrap with Web3Provider |
| `app/auth/signin/page.tsx` | Add "Connect Wallet" button |
| `components/onboarding-flow.tsx` | ENS profile pre-population |
| `components/floor-bento.tsx` | Locked/gated state for VC floors |
| `app/api/floors/[floorId]/route.ts` | Include gating info in response |
| `prisma/seed.ts` | Set requiredSelfPassId on demo floor |
| `.gitignore` | Add `*.key`, `*.pem` |
| `.env.example` | Add Web3 env vars (placeholders only) |

---

## Pitfalls & Mitigations

| Risk | Mitigation |
|------|------------|
| NextAuth v5 beta Credentials quirks | Switch to JWT-only; test authorize→jwt→session chain early |
| SIWE nonce cookie issues | Use httpOnly + SameSite=Lax + Secure; same-origin requests |
| ENS resolution latency (6+ RPC calls) | `Promise.allSettled()` in parallel; cache on User record; resolve once at sign-in |
| Self Protocol SDK immaturity | Register for dev access Day 0; fall back to mock verifier if SDK blocks |
| Making email optional breaks queries | Audit all `session.user.email` usage — 5 locations found: auth-helpers:9, admin-auth:11+14, admin/layout:18+27+56, dual-auth:22, invitations/claim. All now addressed. |
| Unchecksummed addresses cause duplicate Users | Always `checksumAddress()` before DB write; PostgreSQL unique is case-sensitive |
| JWT cookie size limit (~4KB) | Don't store long ENS avatar URLs in JWT; store only name/address, resolve avatar at render time |
| JWT sessions cannot be revoked server-side | Known limitation for hackathon; if wallet compromised, sessions persist until JWT expiry |
| EIP-6963 demo without Moonpay wallet | Install Moonpay extension on demo machine; AppKit shows all wallets regardless |
| Existing prod sessions invalidated by JWT switch | Acceptable for hackathon; all users re-sign-in |

## What to Cut If Time Runs Short

1. **Cut first:** Self Protocol real QR integration (Phase 3D) → replace with mock "Verify" button. Saves ~2hr.
2. **Cut second:** ENS avatar resolution → keep name/description/url/socials. Saves ~30min.
3. **Cut third:** Onboarding step auto-skip logic → keep pre-fill, users click through. Saves ~1hr.
4. **Cut fourth:** ENS during auth (Phase 2B) → resolve lazily in onboarding only. Saves ~30min.
5. **Never cut:** Wallet auth (Phase 1) — everything depends on it.

## Environment Variables Needed

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # From Reown dashboard (safe to expose — it's a project ID, not a secret)
ETHEREUM_RPC_URL=                        # Server-side mainnet RPC (Alchemy/Infura — NEVER prefix with NEXT_PUBLIC_)
SELF_APP_ID=                             # From Self Protocol developer portal
ADMIN_WALLETS=                           # Comma-separated checksummed addresses for admin access
```

**Removed `NEXT_PUBLIC_RPC_URL`** — client-side wagmi uses viem's built-in public transport. Alchemy/Infura keys stay server-side only via `ETHEREUM_RPC_URL`.

---

## Ethskills Review Scorecard

| Category | Original | After Fixes | Notes |
|----------|----------|-------------|-------|
| Library choices | 9/10 | 9/10 | Textbook modern stack |
| Security | 5/10 | 8/10 | Added checksumming, fixed RPC leak, SIWE expiration, secret hygiene |
| Frontend UX | 4/10 | 7/10 | Added four-state flow, per-action states, address display, error translation |
| Architecture | 8/10 | 9/10 | Fixed admin auth gap, added JWT size awareness |
| Completeness | 6/10 | 9/10 | Added 4 missed files, .env.example, address utility, display component |
| Hackathon pragmatism | 9/10 | 9/10 | Cut priorities well-ordered |

### What the plan gets right (validated by ethskills)
- **Offchain-first architecture** — profiles stay in PostgreSQL, no smart contracts deployed (ethskills Ship: "keep offchain: user profiles, preferences, settings")
- **Zero contracts** — aligns with "if you need more than 3 contracts for an MVP, you're over-building"
- **wagmi + viem stack** — canonical modern Ethereum libraries, no ethers.js
- **ENS resolution with `Promise.allSettled()`** — correct resilience pattern
- **SIWE via Credentials provider** — well-established NextAuth pattern
- **EIP-6963 via @reown/appkit** — satisfies Moonpay OpenWallet Standard
