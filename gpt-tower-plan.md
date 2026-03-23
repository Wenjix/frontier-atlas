# Web3 Hackathon Plan for Frontier Atlas, Revised After EthSkills Review

## Summary
- Keep Frontier Atlas as a Web2 application with a Web3 capability layer.
- Do not replace the current Auth.js, invitation, or Telegram systems in hackathon scope.
- Treat this as a `0-contract` MVP:
  - No Atlas smart contracts.
  - No token approvals.
  - No onchain storage of profiles, memberships, or app state.
  - Web3 is used only for wallet-linked identity, ENS enrichment, and Self proof-based access.
- Preserve Postgres as the system of record for `User`, `Member`, `MemberProfile`, and `MemberFloorMembership`.
- Add one showcase gated floor: `floor-12` (“Ethereum & Decentralized Tech”).

## Why the prior plan changes
- EthSkills `ship` says most MVPs should use `0-2` contracts and keep profiles, search, and mutable product logic offchain. This repo already fits that pattern, so the plan should explicitly say `0 contracts`, not imply an eventual onchain app layer.
- EthSkills `wallets` adds missing operational guardrails: no custody, no private-key handling, no hidden transaction flows, and explicit wallet safety constraints.
- EthSkills `frontend-ux` adds concrete UI requirements the prior plan did not specify: per-button pending states, address UX, RPC reliability, and user-readable error handling.
- EthSkills `tools` confirms `wagmi + viem` is the right frontend stack here; there is no reason to force Scaffold-ETH 2 or Foundry into this repo unless smart contracts are added later.
- EthSkills `l2s` suggests Base is the best default execution network for future consumer/social wallet actions, but ENS still resolves from Ethereum mainnet. The plan should separate “wallet UX default chain” from “ENS resolution chain.”

## Scope and architecture
- In scope:
  - Link one EVM wallet to an existing Atlas account after existing sign-in.
  - Add MoonPay-branded wallet bootstrap/link option for hackathon judging.
  - Add standards-based EIP-6963 wallet connection as the canonical path.
  - Resolve ENS profile metadata after wallet verification.
  - Verify one Self proof to unlock one gated floor.
  - Enforce gated-floor access in server routes.
- Out of scope:
  - Wallet-first login replacing Auth.js.
  - Smart contracts, token issuance, NFTs, or onchain memberships.
  - Telegram wallet UX.
  - Cross-chain bridging, account abstraction, ERC-4337, or EIP-7702 features.
  - Treasury/admin wallets or any server-held signing keys.

## Chain and network defaults
- Wallet linking:
  - Accept any EVM wallet provider capable of standard message signing.
  - Do not require a chain switch just to link a wallet.
- ENS:
  - Always resolve against Ethereum mainnet.
- Future-facing default chain for wallet-oriented UX:
  - Show Base as the preferred network in UI copy and explorer links where a chain must be named.
  - Reason: if later scope adds user transactions, Base is the default consumer/social network.
- Since hackathon scope has no user-submitted onchain transactions, there is no mandatory wrong-network gate in the wallet-link flow.

## Data model additions
- Add `WalletAccount`:
  - `id`
  - `userId @unique`
  - `address @unique`
  - `chainId`
  - `source` (`EIP6963`, `MOONPAY`)
  - `ensName?`
  - `ensAvatarUrl?`
  - `ensUrl?`
  - `verifiedAt`
  - timestamps
- Add `WalletLinkChallenge`:
  - `id`
  - `userId`
  - `address`
  - `chainId`
  - `nonceHash @unique`
  - `expiresAt`
  - `consumedAt?`
  - timestamps
- Add `FloorAccessProof`:
  - `id`
  - `memberId`
  - `floorId`
  - `provider` (`SELF`)
  - `walletAddress`
  - `attestationId?`
  - `metadata Json?`
  - `verifiedAt`
  - unique on `[memberId, floorId, provider]`
- Add `FloorAccessMode` enum:
  - `LEGACY`
  - `SELF_PROOF`
- Add to `Floor`:
  - `accessMode` default `LEGACY`
  - `selfRequirementKey?`
- Keep existing `Invitation`, `EmailLog`, `User.email`, and Telegram models intact.

## Server interfaces
- `GET /api/me/wallet`
  - Returns linked wallet summary and ENS snapshot.
- `POST /api/me/wallet/challenge`
  - Input: `{ address, chainId, source }`
  - Output: `{ nonce, message, expiresAt }`
  - Requires current Atlas session.
- `POST /api/me/wallet/verify`
  - Input: `{ message, signature, source }`
  - Verifies SIWE-style message signature against stored challenge.
  - Upserts `WalletAccount`.
  - Triggers ENS snapshot sync.
- `POST /api/floors/[floorId]/self/verify`
  - Input: `{ proofPayload, walletAddress }`
  - Requires current Atlas session plus a linked wallet matching the verified address.
  - Verifies the Self proof and upserts:
    - `MemberFloorMembership`
    - `FloorAccessProof`
    - draft `MemberProfile` if missing
- Extend `GET /api/floors/[floorId]`
  - Add `accessMode`
  - Add `requiresSelfProof`
  - Add `isUnlocked`
- Add internal helper `requireFloorAccess(request, floorId)`
  - For `LEGACY`, preserve current behavior.
  - For `SELF_PROOF`, require active membership for that floor.

## Exact authorization changes
- Keep public floor metadata readable.
- Gate these floor routes with `requireFloorAccess` for `SELF_PROOF` floors:
  - `/api/floors/[floorId]/people`
  - `/api/floors/[floorId]/events`
  - `/api/floors/[floorId]/leads`
  - `/api/floors/[floorId]/pulse`
  - `/api/floors/[floorId]/onboarding-stats`
- Do not rely on current “any member” checks for the gated floor.
- Keep legacy floors unchanged.

## Wallet UX requirements
- Web only.
- Add a wallet section to the signed-in web experience:
  - `Connect Wallet`
  - `Connect with MoonPay`
  - linked wallet summary
  - ENS badge/avatar if available
- Canonical flow:
  1. User signs in with existing Atlas auth.
  2. User connects wallet via EIP-6963 or MoonPay path.
  3. App requests signature for wallet linking.
  4. Server verifies signature and stores wallet.
  5. App fetches ENS snapshot.
  6. User opens floor 12 and sees locked state if not yet verified.
  7. User completes Self proof.
  8. App unlocks floor 12 by normal membership.
- Frontend state rules:
  - Separate pending states for:
    - wallet connect
    - MoonPay launch
    - signature request
    - wallet verification
    - ENS sync
    - Self proof verification
  - Never share one `isLoading` flag across these actions.
- Address UX:
  - Truncate addresses safely.
  - Copy-to-clipboard.
  - Explorer link.
  - Prefer ENS name when available; fallback to checksum address.
- Error UX:
  - Show readable errors near the triggering action.
  - Translate wallet rejection, expired challenge, unsupported provider, and Self verification failures into product language.
- RPC:
  - Use dedicated configured RPCs, not accidental public fallback only.

## MoonPay integration decision
- Keep MoonPay in scope because you asked for it explicitly.
- Use MoonPay as a wallet-bootstrap and branded connection path, not as Atlas account auth.
- MoonPay path must terminate in the same server-side wallet-link verification used by the standard wallet flow.
- If MoonPay provider/session cannot produce a reliable address plus signature in implementation testing, degrade it to:
  - “Create/Connect wallet with MoonPay”
  - then continue with standard EIP-6963 linking
- The Atlas auth session remains owned by Auth.js.

## ENS behavior
- Resolve from Ethereum mainnet after wallet verification.
- Store snapshot fields only:
  - `ensName`
  - `ensAvatarUrl`
  - `ensUrl`
- Never overwrite a user-edited Atlas profile field with ENS data.
- Only prefill empty fields during first-time onboarding suggestions.

## Self behavior
- Gate only `floor-12`.
- Set:
  - `Floor.accessMode = SELF_PROOF`
  - `Floor.selfRequirementKey = "humanity"`
- Backend verification uses a static config mapping for `"humanity"`.
- Proof success grants normal Atlas membership in Postgres.
- Do not write anything onchain.
- If a member already has a home floor, do not rewrite it when Self unlocks floor 12.

## Security and operational guardrails
- The app never stores or handles user private keys.
- The server never signs on behalf of users.
- Wallet interaction in scope is message signing only.
- No transaction sending, no approvals, and no gas sponsorship in hackathon scope.
- No secrets committed to git.
- If future scope adds deployer/admin wallets, require Safe-based custody and hardware-backed keys, but that is explicitly out of scope here.

## Tooling and implementation constraints
- Use:
  - `wagmi`
  - `viem`
  - `@tanstack/react-query`
  - `siwe`
  - MoonPay SDK as wallet-bootstrap path
  - Self frontend + backend SDKs
- Do not migrate this repo to Scaffold-ETH 2.
- Do not introduce Foundry or Solidity tooling unless smart contracts are later added.
- Keep implementation inside the existing Next.js + Prisma app.

## Environment additions
- `ETH_MAINNET_RPC_URL`
- `BASE_RPC_URL`
- `NEXT_PUBLIC_BASE_CHAIN_ID=8453`
- `MOONPAY_PUBLISHABLE_KEY`
- `SELF_APP_NAME`
- `SELF_SCOPE`
- `SELF_ENDPOINT` or equivalent verifier config
- Preserve existing Auth.js, SMTP, and Telegram env vars.

## Tests and acceptance criteria
- Wallet link challenge:
  - expires correctly
  - cannot be replayed
  - rejects mismatched address and signature
- Wallet link:
  - works for both standard wallet path and MoonPay path
  - remains bound to an authenticated Atlas user
- ENS:
  - successful lookup stores snapshot
  - lookup failure does not fail wallet linking
- Self proof:
  - verifies once and is idempotent
  - grants `MemberFloorMembership`
  - does not duplicate proof or membership rows
- Authorization:
  - non-members cannot read gated floor people/events/leads/pulse/onboarding-stats
  - legacy floors still behave as before
- Regression:
  - email sign-in still works
  - invitation claim still works
  - Telegram linking still works
  - admin email authorization still works
- Manual demo:
  1. Sign in via current web auth.
  2. Link wallet via EIP-6963.
  3. Repeat with MoonPay-branded path.
  4. See ENS data on account card.
  5. Open floor 12 and see locked state.
  6. Complete Self proof.
  7. Refresh and confirm floor 12 data unlocks.
  8. Confirm the membership is visible to the same account in Telegram.

## Assumptions and defaults
- One linked wallet per Atlas user in hackathon scope.
- One gated showcase floor only.
- No Atlas smart contracts are deployed.
- Base is the default named chain for future Web3 UX; ENS remains mainnet-only.
- Telegram stays Web2-authenticated and inherits unlocked access through shared server-side membership.
- `pnpm lint` could not be verified in the current environment because `eslint` is not installed yet.
