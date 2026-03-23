# The Frontier Atlas Web3 Transition Plan

## 1. Executive Summary
**The Problem:**
Frontier Atlas is a beautiful, highly functional spatial community platform. However, it relies on legacy Web2 architecture: centralized email magic links for authentication, manual database-driven admin invitations for access control, and siloed PostgreSQL storage for user identities. This creates friction in user onboarding, limits interoperability with the broader crypto ecosystem, and creates single points of failure for community data.

**The Solution:**
We are transitioning Frontier Atlas into a state-of-the-art Web3 application by replacing its Web2 primitives with a highly reliable, frictionless decentralized architecture. We will implement:
1. **Moonpay OpenWallet Standard:** For seamless, standard-compliant wallet discovery and connection.
2. **ENS Identity:** To automatically resolve and populate rich user profiles directly from the blockchain immediately upon connection.
3. **Self Protocol VCs:** To replace manual admin invites with cryptographic, token-gated floor access.

This approach preserves 85% of the existing Next.js/Prisma UI and logic while transforming the app into a prime candidate for three major hackathon prize tracks (Moonpay, ENS, Self Protocol), ensuring a reliable and impressive demo without the overhead of complex custom cryptography.

---

## 2. Data Models (Prisma Schema Updates)

We are extending the existing PostgreSQL schema to support blockchain identifiers while deprecating the reliance on email.

```prisma
// ─── Updated User Model ───
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique // Deprecated: No longer required
  walletAddress String?   @unique // NEW: The primary identifier
  ensName       String?           // NEW: Resolved ENS name (e.g. wenjie.eth)
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  
  accounts      Account[]
  sessions      Session[]
  member        Member?
  telegramLink  MemberTelegramLink?
}

// ─── Updated Floor Model ───
model Floor {
  id               String    @id @default(cuid())
  number           String    @unique
  name             String
  requiredSelfPassId String? // NEW: ID of the Self Protocol VC required to join
  // ... existing fields ...
  memberships      MemberFloorMembership[]
}

// Note: MemberProfile remains largely unchanged, but will be auto-populated via ENS.
```
*Note: The `Invitation` model and its associated enums will be deprecated entirely.*

---

## 3. CLI/API Surface

### Next.js API Routes (Server-Side)

**`POST /api/auth/siwe/verify` (New)**
- **Description:** Verifies standard Sign-In with Ethereum (SIWE) signatures generated via the Moonpay connected wallet, issuing a NextAuth session.
- **Payload:** `{ message: "...", signature: "0x..." }`
- **Response:** `200 OK` `{ user: { id, walletAddress, ensName } }`

**`POST /api/floors/:floorId/verify-pass` (New)**
- **Description:** Verifies a Self Protocol presentation proof. If valid, grants floor access.
- **Payload:** `{ proof: "ey..." }`
- **Response:** `200 OK` `{ membershipId: "..." }`

### Client-Side Hooks (wagmi/viem)
```typescript
// Example: Resolving ENS data in the frontend after wallet connection
import { useEnsName, useEnsAvatar, useEnsText } from 'wagmi'

const { data: ensName } = useEnsName({ address: user.walletAddress })
const { data: avatar } = useEnsAvatar({ name: ensName })
const { data: github } = useEnsText({ name: ensName, key: 'com.github' })
```

---

## 4. Architecture Diagrams

**Authentication & Identity Flow (Moonpay + ENS)**
```ascii
+-------------+       +------------------+       +------------------+
| User Device | ----> | OpenWallet (UI)  | ----> | SIWE Auth        |
| (Browser)   |       | (Moonpay EIP6963)|       | (NextAuth)       |
+-------------+       +------------------+       +--------+---------+
                                                          |
                                                          v
+-------------+       +------------------+       +------------------+
| Prisma DB   | <---- | Next.js Backend  | <---- | viem ENS Resolver|
| (Postgres)  |       | (Profile Sync)   |       | (Mainnet RPC)    |
+-------------+       +------------------+       +------------------+
```

**Access Control Flow (Self Protocol)**
```ascii
+-------------+       +------------------+       +------------------+
| User clicks | ----> | Self Protocol    | ----> | POST /verify-pass|
| "Join Floor"|       | SDK (Frontend)   |       | (Next.js API)    |
+-------------+       +------------------+       +--------+---------+
                                                          |
                                                          v
+-------------+                                  +------------------+
| UI Updates  | <------------------------------- | Prisma DB        |
| (Unlocked)  |                                  | (Grants Access)  |
+-------------+                                  +------------------+
```

---

## 5. Error Handling

| Scenario | What can go wrong | How to recover |
|----------|-------------------|----------------|
| **Wallet Connection** | User rejects Moonpay/wagmi connection prompt. | Show a toast: "Wallet connection required." Provide a fallback to read-only mode. |
| **SIWE Fails** | User rejects the signature request in their wallet. | Catch the rejection. Display standard `shadcn/ui` alert and prompt them to try again. |
| **ENS Resolution Fails** | RPC node rate limit or user doesn't have an ENS name. | Gracefully degrade. Use the raw `walletAddress` as their `name` and prompt them to manually fill the `MemberProfile` form. |
| **Self Pass Invalid** | User tries to join a floor but doesn't hold the required VC. | Self SDK throws an error. Show a modal explaining how to mint the required Self Pass. |

---

## 6. Implementation Roadmap

**Phase 1: Foundation (Day 1)**
- [x] Branch `feature/web3-synthesis`.
- [x] Update Prisma schema (`walletAddress`, `ensName`, `requiredSelfPassId`).
- [x] Remove Nodemailer and Email Magic Link logic.

**Phase 2: Auth & Identity (Days 1-2)**
- [x] Implement Moonpay OpenWallet standard via `wagmi` and custom connect UI.
- [x] Implement SIWE (Sign-In with Ethereum) for NextAuth session management.
- [x] Add `viem` ENS resolution in the NextAuth callback or immediately post-login to auto-populate profiles.

**Phase 3: Access Control (Day 2)**
- [x] Deprecate the existing email-based `invitation-service.ts`.
- [x] Integrate Self Protocol SDK on the frontend for locked floors.
- [x] Build `/api/floors/[id]/verify-pass` to issue `MemberFloorMembership` upon VC proof.

**Phase 4: Polish (Day 3)**
- [x] Record the demo video and write the `README.md` mapping features to prize tracks.

---

## 7. Comparison Tables

**Why this approach over alternatives?**

| Feature | Our Approach | Alternative | Why Ours is Better |
|---------|--------------|-------------|--------------------|
| **Connection** | **Moonpay OpenWallet Standard** | Custom Ethers.js connectors | EIP-6963 automatically detects new browser wallets without updating code. Much more resilient and easier to implement than raw WebAuthn. |
| **Profiles** | **ENS Text Records** | Manual Form Entry | Instant onboarding. If a user has a rich ENS profile, they skip the 5-step setup wizard entirely. |
| **Access** | **Self Protocol VCs** | Standard ERC20/ERC721 Token Gating | VCs are sybil-resistant and privacy-preserving. Users prove they meet criteria without exposing their entire wallet history. |