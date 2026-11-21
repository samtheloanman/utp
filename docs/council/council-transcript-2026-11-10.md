# LLM Council Transcript — UTP Modular DB, Rootstock DAO POC & Alpha-Net Architecture

- **Timestamp**: `2026-11-10T18:45:00-08:00`
- **Branch**: `feat/superpowers-civic-auth` (`HEAD` = `e8b86e2` on `master`, `origin/master` = `777658f`, verified bundle = `23f70bf`)
- **Methodology**: Karpathy 5-Advisor Independent Parallel Deliberation → Randomized Blind 5-Way Peer Review → Chairman Synthesis + Live `autoresearch` & `recursive-superpowers-engine` Verification

---

## 1. Original User Request

1. Deliberate via an **LLM Council of Experts** to provide definitive end-to-end decisions on:
   - **D1**: Mapping Manifesto approval (consolidating 18 colliding SQL tables into canonical modular tables).
   - **D2**: DB access layer (`@supabase/supabase-js` + generated types vs. Drizzle ORM / Kysely).
   - **D3**: On-chain DAO indexing (`viem` + OpenZeppelin `GovernorStorage` on Rootstock Testnet `31` → open-source **Ponder** on **UTP Alpha-Net**).
   - **D4**: Optional LLM Data Chat interface (`/building-data-apps`).
2. Run **`/recursive-superpowers-engine`** + **`/autoresearch`** in parallel, verifying every assumption against official docs and live workspace/provider state, to resolve:
   - **Q1**: Unpacking `utp-first-cycle.bundle` (`23f70bf`) + patching `/api/debate` XSS.
   - **Q2**: Sequencing **Phase 1 (Rootstock Testnet 31 DAO POC)** → **UTP Alpha-Net** → **Phase 2 (Custom Rust/STARK + ML-DSA-65 Bitcoin L2)**.
   - **Q3**: Enforcing non-deployer `Guardian` & independent `Voter A` / `Voter B` EOAs and calibrating Rootstock block-time parameters.

---

## 2. Framed Council Question (Enriched with Verified Live Evidence)

```text
CORE QUESTION: Decide the end-to-end architecture and execution sequence to ship UTP's database, civic voting app, live MVP DAO on Rootstock Testnet (Chain 31), and subsequent UTP Alpha-Net across 4 Architecture Decisions (D1-D4) and 3 Execution Questions (Q1-Q3):

- D1 (Schema Consolidation):
  - Option 1A = Consolidate into canonical greenfield tables immediately before landing `utp-first-cycle.bundle`.
  - Option 1B = Unpack `utp-first-cycle.bundle` (`23f70bf`, 16 commits + 4 migrations + `scripts/test-db.sh`) intact first, archive colliding `supabase/migration.sql`, and layer an additive forward migration (`20261110000000_*.sql`) for `chain_networks`, `(SELECT auth.uid())` RLS `initPlan`, `poll_votes` privacy fix, `ocd_id`, `search_tsv`, and `dao_proposals`.
- D2 (DB Access Layer):
  - Option 2A = Zero-ORM `@supabase/supabase-js` + `@supabase/ssr` (installed, native RLS) + `supabase gen types typescript` + lightweight runtime validation.
  - Option 2B = Add Drizzle ORM or Kysely over direct TCP (requires manual RLS transaction wrappers; neither `drizzle-orm`, `kysely`, nor `zod` is in `package.json`).
- D3 (DAO -> Alpha-Net Indexing):
  - Option 3A = OpenZeppelin `GovernorStorage` (installed in `@openzeppelin/contracts@^5.0.0`) + `viem` `eth_call` sync/reader on Rootstock Testnet 31, reserving Ponder (`ponder.sh`) for UTP Alpha-Net.
  - Option 3B = Deploy Ponder now on Rootstock 31 (live probe at block 8,282,078 proved `eth_getLogs` returns `-32601` on `public-node.testnet.rsk.co` and `code 19` on `drpc.org`).
- D4 (AI Data Chat):
  - Option 4A = Defer LLM Data Chat; strip `dangerouslySetInnerHTML` XSS and fake CBO citations from `/api/debate` now, ship deterministic plain-text source-grounded summaries + Postgres `TSVECTOR` search.
  - Option 4B = Ship Gemini/OSS LLM Data Chat inside MVP DAO release.
- Q1 (Bundle Merge): Unpack `utp-first-cycle.bundle` (`23f70bf`) onto `feat/superpowers-civic-auth` (replacing raw uncommitted OAuth files) + patch `/api/debate` XSS in the same branch vs rewrite?
- Q2 (L2 & Alpha-Net Sequence): Ship Rootstock Testnet 31 EVM DAO POC first (honestly labeled EVM sidechain), then UTP Alpha-Net once DAO works, keeping custom Rust/STARK + ML-DSA-65 rollup on gated R&D track vs holding DAO for custom L2?
- Q3 (Testnet Signers & Timing): Enforce distinct EOAs (`Deployer` 0 votes, `Voter A` 250k + `Voter B` 250k >= 400k quorum, non-deployer `Guardian`) and handle Rootstock's measured `25.82s` block time (`2880` blocks = `20.65h`, `3600` blocks = `25.8h` voting wait)?

VERIFIED LIVE FACTS:
- Zero UTP Supabase project exists in org `ywdpwnblbkfaefovqkkk` yet (greenfield DB; local PostgreSQL 16.14 `pg_ctl`/`psql` + `supabase` CLI 2.72.8 installed on `mbp-2023`).
- Repo mixes Privy (`Shared.tsx:170` + `Providers.tsx:23` fallback `cm0q8k5xw000108jz7xk64b9a`) in client UI with Supabase Auth (`@supabase/ssr`) in bundle APIs and `VotePanel.tsx`.
- Live isolated verification of `23f70bf` on `mbp-2023`: `107/107` web tests pass; `27/27` disposable-Postgres tests pass once 3 macOS bugs in `scripts/test-db.sh` (`PGBIN`, Bash 3.2 `AS[@]`, `LC_ALL=C`) are patched.
- Rootstock Cancun opcodes (`PUSH0`, `MCOPY`, `TSTORE`) verified live on Chain 31; `175/175` Hardhat tests pass; new npm packages require owner/security approval.
```

---

## 3. Round 1 — Independent Parallel Advisor Responses

### Advisor 1: The Contrarian (`378b659e-aa3e-4f62-abe5-1898a5ac7a0a`)
The fatal flaw everyone is dodging is split-brain identity: client UI runs Privy while bundle APIs enforce Supabase Auth (`auth.uid()`). Until Privy is removed or bridged into Supabase JWTs, RLS rejects wallet users.

- **D1 (1A):** Zero live database exists. Patching 18 colliding tables and a `poll_votes` privacy leak via `20261110000000_*.sql` bakes permanent debt into greenfield infrastructure just to save 16 unshipped commits. Ship 8 canonical tables first.
- **D2 (2A):** Direct-TCP ORMs require manual RLS transaction wrappers; one missed wrapper leaks ballots, and unapproved packages stall delivery.
- **D3 (3A):** 3B is dead (`eth_getLogs` returns `-32601` and `code 19`). `GovernorStorage` + `eth_call` works, but `dao_proposals` sync lacks confirmation guards against Rootstock reorgs.
- **D4 (4A):** Adding LLM chat to `/api/debate` alongside `dangerouslySetInnerHTML` XSS and fake CBO citations invites prompt-injected XSS and credibility ruin.
- **Q1:** Salvage `scripts/test-db.sh` and valid routes from `23f70bf`, drop colliding SQL and raw OAuth, fix XSS, and unify Privy/Supabase Auth first.
- **Q2:** Ship Rootstock 31 DAO first; gating MVP on custom STARK + ML-DSA-65 guarantees vaporware.
- **Q3:** Enforce 4 distinct EOAs (`Deployer`, `Voter A`, `Voter B`, `Guardian`), and parameterize short (~60-block) QA voting periods before one `3600`-block (`25.8h`) rehearsal.

---

### Advisor 2: The First Principles Thinker (`55d9f339-eefc-4dd2-b81a-3ce87e7b7ce9`)
You are solving one problem: proving a citizen can authenticate, inspect real legislation, and cast a verifiable on-chain vote. Everything else is premature scaffolding.

Fix the unasked flaw first: Privy in UI and Supabase Auth in APIs creates two competing identity roots. Make Supabase Auth canonical and bind one verified wallet per user first.

- **D1 (1A):** Migrations exist to protect live data; you have zero production database. Patching 18 colliding tables (`1B`) bakes in day-zero tech debt. Write the 8 canonical tables cleanly.
- **D2 (2A):** Drizzle/Kysely (`2B`) bypasses native Postgres RLS just to rebuild auth wrappers in TypeScript. Use `@supabase/supabase-js` with generated types.
- **D3 (3A):** Logs are derivative, and Rootstock RPCs reject `eth_getLogs`. Contract storage is ground truth. Read `GovernorStorage` via `eth_call`; skip Ponder until scale demands it.
- **D4 (4A):** Hallucinated citations destroy civic trust. Delete `/api/debate` XSS and fake CBO claims; ship `TSVECTOR` search.
- **Q1:** Port `utp-first-cycle.bundle` app/auth logic onto the 8-table schema and patch `/api/debate` XSS immediately.
- **Q2:** Ship Rootstock 31 DAO first. Governance mechanics are orthogonal to STARK/ML-DSA-65 R&D.
- **Q3:** Enforce the 4-role EOA split; set testnet `votingPeriod` to ~70 blocks (~30m) rather than waiting 25.8 hours.

---

### Advisor 3: The Expansionist (`07538a55-586a-47fc-912b-e3d32bf8ea9a`)
- **D1 (1B) & Q1 (Unpack + Patch):** Unpack `utp-first-cycle.bundle` onto `feat/superpowers-civic-auth`, patch `/api/debate`, and add the forward migration. Pairing `ocd_id` (Open Civic Data) with `chain_networks` and `dao_proposals` creates a forkable municipal-to-DAO standard any city can boot in one command, bridging Privy wallets onto Supabase identity as a portable civic passport.
- **D2 (2A):** Choose zero-ORM `@supabase/supabase-js` with generated TypeScript types and native RLS. PostgREST turns UTP's schema into an instant, permissioned public civic API—unlocking third-party dashboards, delegate tooling, and citizen apps with zero middleware.
- **D3 (3A):** Ship `GovernorStorage` + `viem` `eth_call` sync now, reserving Ponder for Alpha-Net. On-chain proposal enumeration makes governance verifiable from any IPFS frontend or community mirror without paid archive RPCs.
- **D4 (4A -> 4B):** Ship deterministic summaries and `TSVECTOR` search now as an MCP-ready, citation-verified retrieval primitive so open-weight civic AI agents plug in cleanly right after MVP.
- **Q2 & Q3:** Launch Rootstock 31 first to capture Bitcoin-ecosystem mindshare and live governance telemetry while Rust/STARK + ML-DSA-65 matures. Enforce the 3-EOA split (`Voter A`, `Voter B`, `Guardian`) with dual-speed Governor presets (`~140` blocks fast-track vs `3600` blocks constitutional) to pioneer bicameral DAO velocity.

---

### Advisor 4: The Outsider (`7d6f1e95-b832-4e5d-8592-629d01327b5e`)
Real voters do not care about rollups or ORMs; they leave the moment login breaks, votes leak, or policy facts look fake.

- **D1 (1B) & Q1 (Unpack + Patch):** Unpack `utp-first-cycle.bundle` (`23f70bf`) with `scripts/test-db.sh`, patch `/api/debate` XSS and `poll_votes` privacy immediately, and unify the split Privy/Supabase login before shipping. Forcing a citizen through two disconnected logins—email for polls, wallet for DAO—destroys trust on screen one.
- **D2 (2A):** Use standard `@supabase/supabase-js`. Open-source contributors clone repos expecting zero-config setup and native RLS, not manual TCP wrappers where one missed transaction leaks voter identities.
- **D3 (3A):** Use `GovernorStorage` + `eth_call`. Voters opening a ballot expect instant tallies, not blank screens because Ponder choked on broken `eth_getLogs` endpoints.
- **D4 (4A):** Strip XSS and fake CBO citations today. One fabricated budget statistic permanently ruins civic credibility; plain-text verified sources and `TSVECTOR` search beat a hallucinating chatbot.
- **Q2 (Rootstock First):** Ship the working DAO now with honest, jargon-free labels; never block real civic users on custom cryptography R&D.
- **Q3 (3 Signers, Fast Demo Cycle):** Enforce 3 separate signers so governance isn't single-wallet theater, and add a ~35-block (~15-minute) testnet preset because no contributor waits 26 hours to test a vote.

---

### Advisor 5: The Executor (`22f8ac01-e7b4-4d7b-a649-425785047472`)
- **D1: 1B.** Never rewrite 16 working commits before landing them. Unpack `utp-first-cycle.bundle` (`23f70bf`), archive `supabase/migration.sql`, pass `scripts/test-db.sh` locally, then layer `20261110000000_*.sql` forward.
- **D2: 2A.** `@supabase/supabase-js` and `@supabase/ssr` are installed with native RLS. Drizzle/Kysely trigger package-approval delays and manual RLS wrappers for zero gain. Unify auth on `@supabase/ssr` and remove conflicting Privy session paths.
- **D3: 3A.** Rootstock 31 rejects `eth_getLogs` (`-32601`, `code 19`). Ponder cannot boot on broken log RPCs. Use installed `@openzeppelin/contracts` `GovernorStorage` plus `viem` `eth_call` sync into `dao_proposals`. Save Ponder for Alpha-Net.
- **D4: 4A.** Cut LLM chat from MVP. Strip `dangerouslySetInnerHTML` XSS and fake CBO citations in `/api/debate` now; ship deterministic source-grounded text and `TSVECTOR` search.
- **Q1:** Unpack `23f70bf` onto `feat/superpowers-civic-auth`, drop uncommitted OAuth files, and patch `/api/debate` XSS on the same branch once `scripts/test-db.sh` is green.
- **Q2:** Ship Rootstock 31 EVM DAO POC first (`175/175` Hardhat tests pass), then Alpha-Net. Keep Rust/STARK + ML-DSA-65 strictly off critical path.
- **Q3:** Enforce distinct EOAs (`Deployer` 0 votes, `Voter A` 250k + `Voter B` 250k >= 400k quorum, non-deployer `Guardian`). Parameterize Testnet `votingPeriod` to `120` blocks (~52m at `25.82s`) for Monday E2E completion instead of blocking `25.8h` (`3600` blocks).

---

## 4. Round 2 — Anonymized Blind Peer Review

### Anonymization Key (Revealed Post-Review)
- **Response A** = The Expansionist
- **Response B** = The Contrarian
- **Response C** = The Executor
- **Response D** = The Outsider
- **Response E** = The First Principles Thinker

### Peer Reviewer 1 (`22816976-75ce-4edd-945e-ee49690119e1` — Risk-Hunting Lens)
1. **Strongest: B.** Nails Privy/Supabase `auth.uid()` split, rejects 18 colliding tables and `poll_votes` leak on greenfield DB (`1A`), salvages `23f70bf` routes/tests, catches two risks C/D/E miss: Rootstock reorg sync corruption, `/api/debate` prompt-injected XSS.
2. **Biggest blind spot: A.** Romanticizes auth split as "civic passport," misses `/api/debate` XSS, fake CBO citations, `poll_votes` leak, `Deployer` EOA separation; pushes PostgREST/MCP scope creep.
3. **All five missed:** `2A`+`3A` sync contradiction: writing `eth_call` to `dao_proposals` requires `service_role` (bypassing RLS) plus RPC caching; `ERC20Votes` requires `delegate()` before `propose()` snapshot or 250k tokens vote zero.

### Peer Reviewer 2 (`f8cdb089-5dd2-47bc-86ef-dce4dcaf2b16` — Architectural Simplicity Lens)
1. **Strongest: E** (over B). Migrations protect live data; patching 18 colliding tables on empty DB (A, C, D) creates day-zero debt. E enforces single identity root (Supabase Auth), 8 clean tables, `GovernorStorage` `eth_call` truth.
2. **Biggest blind spot: A.** Chases speculative bloat (bicameral presets, MCP agents, civic passports); ignores broken Privy/Supabase auth split and `/api/debate` XSS.
3. **All missed (A–E):** Cut `dao_proposals` DB sync in MVP. Mirroring chain state without Ponder needs `service_role` writers and drifts; read POC proposals directly via `eth_call` + HTTP cache.

### Peer Reviewer 3 (`0ba39699-64d6-4df5-9890-d835d51b5255` — Open-Source Modularity Lens)
1. **Strongest: E** (**B** second). Best modularity: greenfield 8-table schema (`1A`) spares forks migration cruft (unlike **C/D**), canonical Supabase Auth ends split identity, `GovernorStorage` decouples UI from logs, Rootstock isolates STARK R&D.
2. **Biggest blind spot: A.** Touts forkable standard, yet ships 18 colliding `1B` tables, ignores `/api/debate` XSS, fake CBO citations, `poll_votes` leak, `Deployer` EOA isolation, and Privy lock-in.
3. **All five missed:** Keyless self-hosting and indexer abstraction. Replace Privy with `viem` EIP-4361 verify (zero new deps); wrap `eth_call` sync behind adapter port for Ponder.

### Peer Reviewer 4 (`b5ede2ea-b800-4b77-bce6-a57f38f9de9d` — Citizen Trust & Usability Lens)
1. **Strongest: B.** Protects citizen trust: catches Privy/Supabase RLS login failure, blocks `1B` `poll_votes` privacy leak on greenfield DB, kills `/api/debate` XSS and fake CBO citations, flags Rootstock reorg tally flips (edging D's UX focus, which keeps `1B` debt).
2. **Biggest blind spot: A.** Hypes public PostgREST APIs and "civic passports" while ignoring `/api/debate` XSS, fake CBO citations, `poll_votes` leaks, and broken Privy/Supabase login.
3. **All missed:** Binding Supabase PII to public `Governor` EOAs de-anonymizes on-chain ballots; zero RBTC gas sponsorship blocks non-crypto citizens.

### Peer Reviewer 5 (`3f61a51f-de0a-4f0a-a998-ab56ae7bedb0` — Pragmatic Shipping Velocity Lens)
1. **Strongest: C.** Fastest to green E2E. Lands 16 commits (`23f70bf`) via `scripts/test-db.sh`, skipping B/E's rewrite churn and D's vague auth fix. Uses installed `@supabase/ssr` (zero package approvals) with exact `120`-block (~52m) quorum math.
2. **Biggest blind spot: A.** Scope creep (bicameral DAO, MCP agents) and naive Privy bridging; custom JWT plumbing stalls MVP behind package gates.
3. **All five missed:** Sync trigger and gas. Without Ponder, `eth_call` sync into RLS-locked `dao_proposals` needs service-role writers (cron/webhook), and 4 Rootstock 31 EOAs hit tRBTC faucet limits.

---

## 5. Chairman's Synthesis & Final Verdict

### Where the Council Agrees (5/5 Unanimous Signals)
All five advisors independently converged on five foundational calls:
1. **D2 → Option 2A (`@supabase/supabase-js` + `@supabase/ssr` + CLI-generated TypeScript types, Zero ORM)**: Every advisor rejected Drizzle and Kysely (`2B`). Connecting over direct TCP bypasses Postgres Row-Level Security unless every query manually sets JWT role/claims inside a transaction, where a single forgotten wrapper exposes private civic ballots, and adding unapproved npm packages stalls shipping for zero functional gain.
2. **D3 → Option 3A (`GovernorStorage` + `viem` `eth_call` now; Ponder reserved for Alpha-Net)**: Live RPC probes proved `eth_getLogs` fails on public Rootstock Testnet endpoints (`-32601` and `code 19`), making Ponder (`3B`) non-viable on free public Rootstock RPCs. Adding OpenZeppelin `GovernorStorage` (already installed in `@openzeppelin/contracts@^5.0.0`) lets UTP enumerate proposals directly from contract storage via `eth_call`, deferring Ponder until **UTP Alpha-Net** launches with controlled sequencer RPC logs.
3. **D4 → Option 4A (Defer LLM Data Chat; Eliminate `/api/debate` XSS & Fabricated Citations Immediately)**: All five advisors rejected shipping free-form AI chat in the MVP (`4B`). Interpolating user text into `dangerouslySetInnerHTML` alongside fabricated `"Congressional Budget Office"` citations is an active XSS vulnerability and a fatal blow to civic trust. Deterministic, source-grounded plain-text summaries paired with Postgres `TSVECTOR` full-text search ship first.
4. **Q2 → Rootstock Testnet (`31`) DAO POC First → UTP Alpha-Net Second → Gated Rust/STARK + ML-DSA-65 Track in Parallel**: All five agreed that holding live DAO governance for custom post-quantum rollup cryptography guarantees indefinite delay. Ship the live DAO on Rootstock Testnet (`31`) with honest Bitcoin-sidechain labeling, promote to **UTP Alpha-Net** once DAO governance is proven end-to-end, and advance the STARK/ML-DSA-65 rollup strictly through gates `G0–G4`.
5. **Unify Split-Brain Auth (`Privy` vs. `Supabase Auth`) & Enforce Multi-Signer Testnet Governance (`Q3`)**: Every advisor flagged the collision between `Shared.tsx` (`usePrivy()`) and the API/ballot layer (`@supabase/ssr` `requireUser`), and all five insisted on strict multi-EOA separation (`Deployer` holding `0` votes after setup, independent `Voter A` and `Voter B` required together to clear `400k` quorum, and a separate `Guardian` for emergency `UtPTimelock` cancellation) plus a fast-cycle testnet `votingPeriod` override instead of waiting 21–26 hours per test run.

### Where the Council Clashes (And How Live Evidence Resolves It)
The sharpest clash occurred on **D1 / Q1** (`Option 1A` greenfield 8-table baseline vs. `Option 1B` unpacking `utp-first-cycle.bundle` + additive forward migration):
- **The Case for 1A (`The Contrarian`, `First Principles Thinker`, backed by 4 of 5 Peer Reviewers)**: Because `supabase-mcp-server` confirmed **zero UTP Supabase project exists in production yet**, migrations have no live production data to protect. Shipping 18 colliding definitions and patching privacy leaks on day zero forces every open-source contributor who forks UTP to replay legacy technical debt forever.
- **The Case for 1B (`The Executor`, `The Outsider`, `The Expansionist`, backed by Peer Reviewer 5)**: `utp-first-cycle.bundle` (`23f70bf`) is not vaporware—our live isolated verification on `mbp-2023` proved it passes **`107/107` Vitest web tests** and **`27/27` disposable-Postgres SQL/RLS tests**. Throwing away 16 working commits to rewrite routes from scratch wastes days and introduces fresh auth regressions.
- **The Resolution (Clean Squash-Consolidated Baseline on Top of `23f70bf`)**: Live inspection of `23f70bf:scripts/test-db.sh` revealed why both sides win without compromise. The worst table collisions live in root `supabase/migration.sql` (which `scripts/test-db.sh` never even loads). By **unpacking `23f70bf` intact first** (preserving all 16 commits, `107` web tests, and `27` DB tests), **archiving `supabase/migration.sql` into `archive/sql-legacy/`**, and **consolidating `supabase/migrations/`** so that a clean `supabase db reset` / `npm run test:db` materializes the exact canonical schema (`jurisdictions` w/ `ocd_id`, unified `data_sources`, `bills` w/ `search_tsv`, `chain_networks`, `wallet_links`, `shadow_votes` + `vote_aggregates`, `civic_proposals` with private ballot RLS, `dao_proposals`, `(SELECT auth.uid())` `initPlan` policies, `user_id` indexes, and `rls_auto_enable()`), UTP ships zero legacy SQL cruft to production while keeping 100% of `23f70bf`'s verified application code and tests green.

### Blind Spots the Council Caught in Peer Review
Five critical engineering catches emerged **only** during the anonymous peer-review round and parallel live testing:
1. **`ERC20Votes` Delegation Snapshot Trap (Peer Reviewer 1)**: Transferring `250k UTP` each to `Voter A` and `Voter B` leaves their voting weight at **zero** unless both signers execute `token.delegate(self)` **strictly before** `propose()` records its snapshot block (`clock() + votingDelay`). `scripts/distribute-testnet.cjs` and the E2E runbook must assert `getVotes(voterA) >= 250_000e18` before creating Proposal #1.
2. **Eliminate `service_role` Sync Drift on Rootstock POC via a `DaoReader` Port (Peer Reviewers 1, 2, 3, 5)**: Syncing `eth_call` into an RLS-locked `dao_proposals` table without Ponder requires a privileged `service_role` cron writer and confirmation-depth reorg handling. Instead, define a clean TypeScript `DaoReader` port in `src/modules/dao-chain/`: for Rootstock Testnet (`31`), read `GovernorStorage` directly in Next.js Server Components with short-TTL caching (`revalidate: 15`) and a 2-block confirmation check—zero `service_role` background worker needed—while creating the `dao_proposals` table now so Alpha-Net's Ponder indexer plugs into the exact same `DaoReader` interface later.
3. **Ballot Privacy Separation Between Off-Chain Civic Identity and On-Chain EOAs (Peer Reviewer 4)**: Because `Governor` votes on EVM chains are public by address, exposing `wallet_links` (`user_id ↔ address`) publicly would de-anonymize a citizen's private off-chain legislative `shadow_votes`. `wallet_links` must stay strictly owner-readable (`(SELECT auth.uid()) = user_id`), and public APIs/views must never join `user_id` to wallet addresses.
4. **Replace Privy Lock-In Instead of Bridging Two Auth Stacks (Peer Reviewers 2, 3, 5)**: `Providers.tsx:23` currently ships a hardcoded fallback Privy App ID (`cm0q8k5xw000108jz7xk64b9a`), while `23f70bf` already implements keyless `viem` EIP-4361 SIWE signature verification (`src/lib/wallet/walletLink.ts`). Removing Privy from `TopBar` (`Shared.tsx:170`) in favor of canonical Supabase Auth + standard `wagmi` injected wallets makes UTP 100% self-hostable by any open-source contributor with zero paid SaaS auth keys.
5. **Faucet Bottleneck & macOS `scripts/test-db.sh` Portability (Peer Reviewer 5 + Live Scratch Run)**: Funding 4 separate Rootstock Testnet addresses via rate-limited faucets stalls QA; `distribute-testnet.cjs` should forward `0.002 tRBTC` gas stipends from `Deployer` to `Voter A`, `Voter B`, and `Guardian` in the same setup pass. Locally on macOS Sequoia (`mbp-2023`), `scripts/test-db.sh` failed until patched with `LC_ALL=C`, auto-detected `PGBIN`, and Bash 3.2-safe empty array expansion `${AS[@]+"${AS[@]}"}`.

### The Recommendation (Definitive End-to-End Decisions)
1. **Q1 + D1 (Approved Hybrid `1A/1B`)**: Unpack `utp-first-cycle.bundle` (`23f70bf`) onto `feat/superpowers-civic-auth` (discarding the superseded untracked raw OAuth draft files), patch `scripts/test-db.sh` for macOS + Linux portability, archive colliding `supabase/migration.sql` to `archive/sql-legacy/`, and apply the canonical consolidation migration (`chain_networks` replacing `CHECK (chain_id IN (31))`, `ocd_id` on `jurisdictions`, unified `data_sources`, `search_tsv` on `bills`, unified `civic_proposals` fixing the `poll_votes` leak, `dao_proposals`, `(SELECT auth.uid())` `initPlan` RLS + `user_id` B-tree indexes + `rls_auto_enable()` DDL trigger) **before** creating and pushing to a dedicated `utp` Supabase project.
2. **D2 (Option 2A + Canonical Auth)**: Standardize on `@supabase/supabase-js` + `@supabase/ssr` + `supabase gen types typescript` with zero ORM, and replace `Shared.tsx:170`'s Privy `TopBar` login with canonical Supabase Auth + `wagmi` SIWE wallet linking.
3. **D3 (Option 3A + `DaoReader` Port)**: Add OpenZeppelin `GovernorStorage` + `AppConfig.sol` on Rootstock Testnet (`31`) and read proposals via `viem` `eth_call` behind a modular `DaoReader` interface (with `revalidate: 15` caching, skipping fragile `service_role` cron sync in MVP); attach **Ponder** (`ponder.sh`) to `dao_proposals` when **UTP Alpha-Net** launches.
4. **D4 (Option 4A)**: Defer LLM Data Chat until post-DAO POC; immediately strip `dangerouslySetInnerHTML` XSS and fabricated CBO citations from `/api/debate` (`src/app/api/debate/route.ts` + `src/app/issue/[id]/page.tsx`) and ship Postgres `TSVECTOR` legislative search + `DataStatusBadge`.
5. **Q2 & Q3 (Rootstock 31 First → Alpha-Net Second, 4-Role Signer Split & Configurable Block Timing)**: Execute Phase 1 on Rootstock Testnet (`31`) with 4 distinct roles (`Deployer` → `0` votes post-setup, `Voter A` `250k` delegated before `propose()`, `Voter B` `250k` delegated before `propose()`, non-deployer `Guardian`), automated `tRBTC` gas stipends from `Deployer`, and an env-configurable `RSK_TESTNET_VOTING_PERIOD` (`90` blocks / ~39m for QA verification, `2880` blocks / ~20.7h default), then cut over to **UTP Alpha-Net** via a single `chain_networks` row + `deployments/utpAlpha.json`.

### The One Thing to Do First
Authorize **Wave 1 on `feat/superpowers-civic-auth`**: unpack `utp-first-cycle.bundle` (`23f70bf`) over the raw uncommitted OAuth draft files, apply the 3-line macOS `scripts/test-db.sh` fix + `/api/debate` XSS removal + Privy `TopBar` unification + canonical schema migration (`20261110000000_canonical_modular_schema.sql`), and prove `npm run ci:fast` (`107+` web tests, `175` contract tests) and `npm run test:db` (`27+` disposable-Postgres RLS tests) green in one atomic local commit before provisioning the dedicated `utp` Supabase project.
