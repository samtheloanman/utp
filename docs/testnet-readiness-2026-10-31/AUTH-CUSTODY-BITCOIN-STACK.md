# Implementation path: one UTP account, linked wallets, optional custodians

Date: 2026-10-31 PT. Status: proposed stack and acceptance path, not implemented. This document extends `SPEC.md` and `IDENTITY-AND-APP-RESEARCH.md`.

## Decision

Use the existing Next.js 15 + Supabase Auth/Postgres/RLS application as UTP's account and civic data authority. `auth.users.id` is the stable UTP account ID. Keep Privy/Wagmi for the existing Web3 connector and signing UI while proving links to UTP accounts with a server challenge. UTP's Supabase OAuth 2.1 server serves *UTP as provider* to other applications; Google/GitHub, Coinbase and Gemini OAuth are *inbound* provider connections to UTP and do not replace UTP's identity or eligibility system.

Avoid a third auth system. Do not silently equate a Privy DID, an exchange account and a Supabase user. The current local Supabase OAuth code is uncommitted and untested, and the existing Privy button signs users in independently. Reconcile those paths before making any binding vote or credential claim.

## Components and ownership

| Function | Proposed component | Boundary |
|---|---|---|
| App login and session | Supabase Auth + `@supabase/ssr` | Server validates session; `auth.users.id` for RLS and civic records |
| Social login | Existing Supabase Google/GitHub OAuth | Account access; provider email does not prove civic eligibility |
| Phone contact / authenticator | Supabase phone verification and TOTP MFA | Phone is contact tier; TOTP/AAL claim enforced in API and RLS for sensitive actions |
| Passkey | Supabase experimental passkey only after a compatibility spike | Current `@supabase/supabase-js` range is `^2.91.0`; official passkey docs require 2.105.0+, explicit opt-in. Pin/test upgrade or use existing TOTP first |
| Web3 account | Existing Privy + Wagmi + Viem | Sign challenge to link external/embedded wallet; privileged actions require fresh proof of possession and correct chain |
| Credential wallet | Evaluate Credo; local encrypted vault | Credential holder and private data stay user-controlled; separate credential/asset/encryption keys |
| Issuer/verifier | Evaluate Credo or walt.id | Signed, scoped eligibility with status/expiry; never infer identity from a wallet or exchange connection |
| UTP-to-app OAuth/OIDC | Supabase OAuth 2.1 server | Current consent UI is local only; enable/configure only after approval and exact-scope tests |
| Custodian connectors | Provider OAuth if available, otherwise least-privilege user API key in approved secret handling | Optional balances/history only in first version; no credential export to AI models or local plain storage |
| Bitcoin commitments | Self-operated Bitcoin testnet node plus a small anchoring worker, after design review | Commit Merkle root of public audit batch; no personal data, raw credentials or private ballot linkages on chain |

## Link one wallet to one UTP user

1. Authenticate Supabase user. Issue a single-use, short-expiry random nonce tied to user ID, origin, chain, action and intended wallet address.
2. Wallet signs a structured challenge following ERC-4361 for EVM accounts; verify signature on the server using Viem, including contract-wallet signatures if supported. Verify exact domain/URI, chain ID, nonce, issue/expiry and addressed account. Consume nonce atomically.
3. Persist only a unique `(chain_id, normalized_address, supabase_user_id, verified_at, status)` link. Reject the same address on another account; require fresh MFA plus wallet proof for link, unlink and transfer. Investigate account-recovery paths before enabling transfer.
4. Preserve Privy DID as provider metadata, not as the canonical civic identity. Verify Privy access tokens server-side if a Privy-authenticated endpoint is retained; never trust frontend `authenticated` alone.
5. Tests: two UTP accounts racing to link same wallet; replay, wrong origin/chain/address, expired challenge, contract-wallet signature, stolen session without wallet, and wallet without Supabase session.

Supabase `linkIdentity()` supports its OAuth provider identities. It does not by itself prove or register arbitrary EVM wallet ownership. See source links below.

## Custodian API decision

| Provider | Official API finding | UTP first use | Limit |
|---|---|---|---|
| Coinbase App / Advanced Trade | OAuth and API-key account access exist; scopes and portfolio restrictions vary | Research read-only account/balance/history connection using the current OAuth flow and least scope | CDP wallet APIs are a different product. CDP server wallets are controlled by the app server; CDP smart-account support list does not include Rootstock. Do not assume existing `@coinbase/wallet-sdk` grants exchange access or local custody. |
| Gemini Exchange/Custody | OAuth authorization-code flow supports PKCE for public clients and `balances:read`; API keys use HMAC-SHA384. Production OAuth app activation requires Gemini review | Read-only OAuth sandbox balance test, then a reviewed connector | Custodian-held assets remain at Gemini; an API connection does not move them into UTP's wallet. No trading or withdrawal scopes. |
| BitGo / Fireblocks | Institutional wallet/custody APIs exist; product and access model differ | Research later only if a specific institutional custody need exists | Not needed for personal civic identity or initial testnet. Provider adoption is a separate product/security decision. |

No provider account, API key, OAuth app or live balance was accessed in this review. Coinbase OAuth scope details and Rootstock support need exact endpoint validation before implementation; do not infer it from generic CDP wallet documentation. Gemini official OAuth docs explicitly document sandbox and production app review.

## Private code boundary

Provider tokens/keys stay in approved secret storage or a user-controlled encrypted local connector vault, depending on the provider flow and required server access. Never place them in source, build artifacts, Brain, browser logs, AI prompts or on Bitcoin. A server connector has one provider, one user, a small read-only scope and a revocation path. AI receives a filtered result such as a balance summary only after explicit user grant. It cannot call exchange trade/withdraw endpoints.

For any provider requiring persistent server refresh tokens, state clearly that those credentials are *server-held*; do not market that integration as wholly local. Prefer local PKCE/public-client flows only if their token protection is acceptable on each target device. Test lost device, revoked consent, expired token, wrong account, provider outage, compromised refresh token and accidental scope expansion.

## Bitcoin security through code: narrow, measurable claim

Design candidate: collect public DAO deployment/governance audit events and document/version hashes into a deterministic Merkle tree; sign a manifest with the authorized UTP release key; publish its Merkle root in a Bitcoin **testnet** transaction. Record txid, block height/hash, proof path and required confirmations. A verifier independently checks the manifest/event hashes, Merkle path and inclusion in the Bitcoin chain through its own node. Reorgs invalidate provisional anchoring and trigger reconciliation.

This yields tamper-evident evidence that a commitment existed by a chain block, subject to Bitcoin confirmation/reorg assumptions. It does **not** make UTP transactions Bitcoin-final, secure a custodian, verify a custom L2 state transition, protect private credentials, or confer post-quantum security. Those require separate bridge, execution, data-availability, custody and cryptographic designs in `SPEC.md`.

Implementation tests: deterministic root across independent builds; altered leaf and altered path rejection; duplicate/missing event detection; wrong chain/genesis rejection; unconfirmed transaction and reorg handling; independent-node inclusion verification; public manifest reveals no private attributes. Expose `pending`, `confirmed`, `reorged`, and `unavailable` statuses, never a generic `secured by Bitcoin` badge.

## Sequence and acceptance

**Slice 1 — canonical account.** Isolate and test local Supabase auth/OAuth work. Fix callback redirect validation and provider configuration assumptions. Make Supabase session authoritative for civic APIs and RLS. Keep legacy Privy path until linked-wallet migration is tested. No production activation.

**Slice 2 — wallet binding.** Server challenge + signature verification + unique link table, API/RLS tests, two-account race and recovery tests. Wallet-only actions remain possible only where they do not claim civic eligibility.

**Slice 3 — tiered verification.** TOTP step-up first; phone as contact proof. Benchmark experimental Supabase passkey upgrade in isolation. Synthetic issuer/credential validation before any camera provider or real document processing.

**Slice 4 — custodian interface.** Build a provider-neutral `AccountSummary` read-only contract and fake provider tests. Implement Gemini sandbox OAuth `balances:read` as first candidate if review/activation allows; validate Coinbase OAuth scopes separately. No trading or transfer APIs.

**Slice 5 — Bitcoin anchor.** Local regtest deterministic commitment and verifier, then approved public testnet anchor. Tie it to the DAO acceptance manifest, with clear settlement status.

Every slice needs an exact diff, tests and evidence record. External provider/environment changes, secret grants, migrations, wallet transfers, Bitcoin broadcasts and deployments follow their separate approval gates. Continue local implementation of independent slices while external access is pending.

## Sources checked 2026-10-31

- https://supabase.com/docs/guides/auth/oauth-server/getting-started — OAuth server and OIDC; requires project enablement and client registration.
- https://supabase.com/docs/guides/auth/auth-mfa and https://supabase.com/docs/guides/auth/auth-mfa/totp — TOTP/phone, session `aal`; enforce server-side and RLS.
- https://supabase.com/docs/guides/auth/passkeys — experimental; SDK minimum 2.105.0.
- https://supabase.com/docs/guides/auth/auth-identity-linking — OAuth identity linking.
- https://eips.ethereum.org/EIPS/eip-4361 — signed EVM login challenge fields and nonce.
- https://docs.privy.io/authentication/user-authentication/access-tokens — server verification of Privy session tokens.
- https://docs.cdp.coinbase.com/coinbase-app/introduction/changelog — Coinbase App API/OAuth changes.
- https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/managing-accounts — CDP wallet types and supported smart-account networks.
- https://developer.gemini.com/authentication/oauth — Gemini OAuth, PKCE, sandbox, scopes and app review.
- https://developer.gemini.com/authentication/api-key — Gemini HMAC API keys.
- https://developer.bitcoin.org/devguide/operating_modes.html and https://developer.bitcoin.org/devguide/payment_processing.html — inclusion and confirmation/reorg tradeoffs.
