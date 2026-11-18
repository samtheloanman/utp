# UtP MVP PRD — Testnet Alpha (full chain, California)

Date: 2026-11-17 · Status: Draft for Sam's approval · Replaces as the planning source: `brain/prd.md` v3, `.gsd/ROADMAP.md`, `.gsd/STATE.md` (those stay readable as history) · Builds on: `docs/superpowers/specs/2026-11-14-remaining-work-SPEC.md` · Brand: `DESIGN.md` (civic glass-teal)

## 1. Goal

Ship a closed **Testnet Alpha** in which a California resident can take a civic issue from evidence to a binding DAO decision executed on Rootstock testnet (chainId 31):

> sign in → link wallet → read a sourced CA issue → cast an off-chain sentiment vote → create a proposal tied to that issue → cast a binding on-chain vote → queue → timelock execute

**Success:** at least one real proposal, created from the UI, linked to a sourced CA issue, gets voted on by at least 3 distinct tester wallets and executes through `UtPTimelock` on chain 31. The Playwright end-to-end test of the same flow passes on the Dell CI.

## 2. Users (Alpha)

- **Testers (Alpha):** the agent fleet (Claude Code, Codex, Gemini/Antigravity, Hermes, Paperclip agents). Each agent has its own Google-linked test account and EOA, and runs scripted personas through the Playwright/agent end-to-end suite. Human CA invitees come after the fleet run passes.
- **Civic participant** (invite-only). Reads issues, votes sentiment, holds delegated UTP, votes binding.
- **Proposer**. A tester whose voting power is at or above the proposal threshold.
- **Operator** (Sam / fleet agents). Deploys, distributes UTP, monitors, and holds the guardian veto.

## 3. Scope

### In scope
| Area | Requirement |
|---|---|
| Auth | Supabase sign-in (email magic link + Google OAuth), same-origin redirects, `requireUser` on every write route |
| Wallet | SIWE wallet link/unlink with server HMAC attestation (already built). One wallet per user for the Alpha. Keys stay in the browser |
| Civic data | Designed to work globally, launched first in **California and the US**. Every jurisdiction is keyed by an Open Civic Data division ID (`ocd_id`, already in the schema). Coverage grows by **platform adapter**, not by city: federal (Congress.gov), state (OpenStates, all 50 states), local through agenda-platform adapters (Legistar first, then PrimeGov, CivicClerk, Granicus and others found in the census). **MVP local target:** all 58 CA counties plus CA cities over 100k population, then the 50 largest US cities and 50 largest US counties. Each jurisdiction carries a published coverage status (live / partial / none). Countries outside the US use the same adapter interface later |
| Issue page | Separate sections for evidence, generated analysis and community sentiment. Each summary is cited or labelled "Unverified". Shows source, fetch time and freshness state (fresh / stale / unknown) |
| Sentiment vote | Off-chain, one per user per issue, enforced by the database (built). Labelled **Sentiment, not binding** |
| Proposals | Created from the UI. The description carries the `issueId` plus the hash of the evidence snapshot. The proposal links back to the issue, and the issue shows its proposals |
| Binding vote | ERC20Votes snapshot plus a wallet (ECDSA) signature. For / Against / Abstain. Labelled **Binding, on-chain** |
| Lifecycle UI | `/governance`: list, detail, create, vote, queue, execute, with state from `DaoReader` (GovernorStorage). `/token`: balance, delegate, voting power |
| Chain | Governance core only (DAO, UTPToken, UtPTimelock, GovernancePlugin, Treasury, PluginRegistry) on chain 31 with D2 parameters, source verified on the explorer |
| Ops | Runbook (deploy, verify, distribute, guardian veto, redeploy), rate limits on write APIs, structured logs |

### Out of scope (rejected for the MVP)
Stablecoin, UBTC, vault, event markets and staking (their pages stay in an explicit **Not live** state). Post-quantum hybrid voting and ZK/private voting. Bitcoin anchoring and L2 trust work. Phone, TOTP or camera identity checks. Mainnet. (Coverage is **not** limited to CA: every US jurisdiction gets an explicit live/partial/none status. CA is only the first rollout slice for adapters.)

## 4. Functional requirements

- **FR-1 Auth.** Unauthenticated writes return 401. The OAuth callback rejects redirects to other origins. Sessions work by cookie and by Bearer token.
- **FR-2 Wallet link.** The challenge expires in 5 minutes or less and works once. Linking requires a valid SIWE signature plus the server HMAC. Unlinking requires a signed-in session plus a signature. One wallet per user and one user per wallet.
- **FR-3 Sources.** Each issue record carries `source_id`, `jurisdiction` (federal-CA / state-CA / local-<id>), `source_url`, `fetched_at`, `content_hash` and `freshness`. Ingestion is idempotent (re-running produces no duplicates). Fixture data never shows as live, and sample data carries the "Sample data" badge.
- **FR-4 Citations.** Generated summaries must cite at least one source. A summary with no citation is stored as `unverified` and shown with the Unverified label; it is never shown as trusted.
- **FR-5 Sentiment vote.** One vote per user per issue. Totals are recounted on the server. The UI never shows sentiment counts as binding.
- **FR-6 Proposal creation.** The UI checks proposer voting power against the threshold before sending. The description has the form `utp:issue=<id>;evidence=<sha256>` followed by markdown. The server records an off-chain index row once the proposal transaction is confirmed.
- **FR-7 Binding vote.** Voting is allowed only while the proposal is `Active`. A double vote is blocked on chain and shown clearly in the UI. Voting power is read at the proposal snapshot block.
- **FR-8 Queue/execute.** Buttons appear only in the valid states (`Succeeded` → queue; `Queued` with the delay passed → execute). A defeated proposal can never be queued.
- **FR-9 Degraded mode.** If RPC, Supabase or sign-in configuration is missing, the page renders read-only with a clear banner and never fakes success.
- **FR-10 Gated modules.** Every financial route shows **Not live — gated**. No placeholder addresses and no "verified" badges.

## 5. Non-functional requirements

- **Security:** RLS on every public table. Write routes are rate-limited by user and by hashed IP (`IP_SALT`). Output is sanitized against XSS. Secrets come only from the environment and are never logged. Every new threat is added to `THREAT_MODEL.md`.
- **Quality:** `npm run ci:fast`, `test:db` and `build` pass on the Dell CI and Forgejo runner for the exact PR head.
- **Accessibility:** WCAG 2.1 AA on `/`, `/issue/[id]`, `/governance` and `/token`.
- **Performance:** LCP under 2.5 s on the issue page (preview build, mobile profile).
- **Honesty:** public copy separates live, testnet, and gated functionality.

## 6. Architecture (unchanged core, new wiring)

Next.js 15 (Vercel) → Supabase (`tuajgdhslxqmiaehsend`: auth, issues, votes, wallet links, source registry, proposal index) → viem/wagmi → RSK testnet RPC → Governor/Timelock. Chain reads go through the `DaoReader` port (`src/modules/dao-chain/`); writes go from the user's wallet. Ingestion runs as scheduled jobs (a Vercel cron or the Dell) that call the source adapters in `src/lib/civic/`.

## 7. Delivery waves

| Wave | Deliverable | Exit gate | Needs Sam |
|---|---|---|---|
| **W0 Baseline** | Fix Forgejo run 2 at its root cause. Get a real `hermes-utp` approval. Push the consolidated head to GitHub and replace PR #22. Remove `UTP.zip`, `design.tar.gz`, the PDF and `temp_*` from git. Fix the remote that has the token in its URL | Exact head is green on self-hosted CI and reviewed. PR #22 is closed with a map of what replaced it | Push / PR |
| **W1 Platform** | Supabase sign-in providers. Set the secrets (`WALLET_LINK_SECRET`, `CONGRESS_API_KEY`, OpenStates key, `IP_SALT`). Vercel project and preview | Sign-in → wallet link works on the preview URL | Secrets, Vercel access, provider config |
| **W2 Civic** | Platform census (which agenda system each CA county, CA city over 100k, and top-50 US city/county uses) → OCD-ID registry → Legistar adapter → coverage dashboard. Freshness, citations, the evidence / analysis / sentiment split | All 58 CA counties plus CA cities over 100k carry a coverage status, at least 1 adapter is live, and tests cover jurisdiction mismatch, stale data and uncited output | — |
| **W3 Governance UI** | `/governance` and `/token` in the teal design, proposal ↔ issue links, vote labels | Component tests plus a local-chain end-to-end test (Hardhat node) | — |
| **W4 Testnet** | Signer-role manifest, funded deployer, deploy, verify, smoke test, UTP to testers, delegation | Proposal → vote → queue → execute verified on chain 31. `deployments/rskTestnet.json` committed | Signer custody, funding, broadcast |
| **W5 Alpha** | Playwright end-to-end test against testnet, rate limits, a11y/perf checks, runbook, invites | E2E green on Dell CI. Success metric in §1 met | Sending invites |

Each wave runs one superpowers cycle: `writing-plans` → TDD → verification → PR on branch `claude/UTP-<n>-<slug>`, merged by the automerge bot or Sam only.

## 8. Decisions

1. **Signer roles (council 2026-11-10, Q3, unanimous):** `Deployer` (0 votes after setup, pays gas stipends), `Voter A` (250k UTP), `Voter B` (250k UTP) and `Voter C` (100k UTP, so the 3-wallet success metric holds; it comes from the Deployer's distribution before `propose()`). A and B together clear the 400k quorum and must `delegate(self)` **before** `propose()`, plus a non-deployer `Guardian` (timelock canceller). Testnet custody: one EOA per role, each held by a different fleet agent, private keys in GCP Secret Manager (`cgc-1-places`), never in files or the repo. A public role manifest lists the addresses only. MVP caveat: one operator / GCP principal can reach every key, so this is **not** independent custody. Record the owners, access and recovery in the manifest, and log it in the post-MVP security pass. Mainnet (Phase 3) moves to a Safe multisig with hardware signers. Testnet `RSK_TESTNET_VOTING_PERIOD=90` blocks for QA, 2880 by default.
2. **Jurisdiction scaling:** OCD-ID keyed, platform-adapter coverage (see §3). The adapter priority order is decided by autoresearch plus council before W2.
3. **OAuth:** Google.
4. **Testers:** the agent fleet first (see §2). UTP is split across fleet voter wallets under the council allocation; humans come later.

## 8a. Decision protocol (fleet best practice)

Each material decision follows: autoresearch (live code + primary docs → SPEC with alternatives, failure modes, a reversible experiment, an acceptance gate) → `llm-council` (5 advisors, anonymous peer review, chairman synthesis) → record in `docs/council/` or `docs/superpowers/` → smallest slice through TDD. Precedents: `docs/council/council-report-2026-11-10.html`, `docs/l2-dao-poc-2026-11-05/COUNCIL.md`.

## 9. Risks

- The deployer holds 100% of UTP until distribution and alone exceeds quorum. Distribute and delegate before opening the Alpha.
- OpenStates and Congress.gov rate limits → cache results and ingest on a schedule.
- RSK testnet faucet and RPC reliability → keep a fallback RPC and the gas estimate in the runbook.
- Financial modules are compiled but not deployed. Keep them out of the deploy script (already the case).
