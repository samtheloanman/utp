# SPEC: UTP Modular Schema, Rootstock Testnet DAO POC & Alpha-Net Rollout

- **Date**: `2026-11-10`
- **Branch**: `feat/superpowers-civic-auth`
- **Status**: Autoresearch Verified + 5-Advisor LLM Council Approved (`docs/council/council-transcript-2026-11-10.md`)
- **Authority Gate**: Wave 1 local branch integration awaits owner (`Sam`) `Proceed` confirmation before overwriting untracked OAuth draft files or provisioning a remote `utp` Supabase project.

---

## 1. Objective & Scope

Ship a modular, open-source-forkable United Taxpayers Party (UTP) platform across three clean, non-blocking waves:
1. **Wave 1 — Civic Data, Canonical Auth & Modular Postgres Schema**: Integrate the 16 verified commits in `utp-first-cycle.bundle` (`23f70bf`), eliminate legacy schema collisions (`supabase/migration.sql`) and active security defects (`/api/debate` XSS, `poll_votes` ballot leak, Privy vs. Supabase split-brain auth), and ship the canonical OCD-ID + `chain_networks` Postgres schema verified by disposable-cluster `scripts/test-db.sh`.
2. **Wave 2 — Rootstock Testnet (`31`) Live EVM DAO POC**: Add `AppConfig.sol` + OpenZeppelin `GovernorStorage` on `GovernancePlugin.sol`, read on-chain governance state via a modular `DaoReader` port (`viem` `eth_call` + 15s Next.js Server-Component cache), and complete a 4-role multi-signer proposal/vote/queue/execute/cancel rehearsal on Rootstock Testnet (`31`).
3. **Wave 3 — UTP Alpha-Net Cutover & Ponder Indexing**: Register **UTP Alpha-Net** via a single `chain_networks` row + `deployments/utpAlpha.json`, attach open-source **Ponder** (`ponder.sh`) against Alpha-Net's controlled `eth_getLogs` RPC to populate `dao_proposals`, and enable promoting high-consensus `civic_proposals` (`promoted_to_dao`) to on-chain DAO ballots. *(Custom Rust/STARK + ML-DSA-65 post-quantum rollup remains on its separate `G0–G4` R&D track.)*

---

## 2. Live Autoresearch Evidence Ledger (Zero Assumptions)

| Verification Target | Method / Source | Live Finding | Architectural Impact |
| :--- | :--- | :--- | :--- |
| **Supabase Org State** | `supabase-mcp-server` `list_projects` (`ywdpwnblbkfaefovqkkk`) | 4 unrelated projects (`cmre-mail0`, `cmre`, `cgc-sales-engine`, `ian-production`); **0 `utp` projects exist**. | Greenfield production DB: consolidate legacy table cruft *before* provisioning a dedicated `utp` project; **never** touch CMRE/CGC/IAN. |
| **Bundle `23f70bf` Web Suite** | Scratch `git archive 23f70bf` + `npx vitest run` on `mbp-2023` | **`21/21` files, `107/107` tests PASSED** (`1.52s`). | Unpack `23f70bf` rather than rewriting 16 working commits from scratch. |
| **Bundle `23f70bf` DB Suite** | Scratch `scripts/test-db.sh` on macOS PostgreSQL `16.14` | Failed out-of-the-box on macOS (`PGBIN` Linux path, Bash 3.2 `AS[@]` unbound var, `postmaster` multithread locale); **`4/4` files, `27/27` tests PASSED** (`3.46s`) once patched with dynamic `PGBIN`, `${AS[@]+"${AS[@]}"}`, and `LC_ALL=C`. | Include the 3-line macOS/Linux portability patch in Wave 1 Commit 1. |
| **Split-Brain Auth Audit** | `git grep -n -i privy 23f70bf -- src/` | `Shared.tsx:170` calls `usePrivy()` and `Providers.tsx:23` has hardcoded fallback `cm0q8k5xw000108jz7xk64b9a`, while `VotePanel.tsx` + `/api/*` require Supabase session (`@supabase/ssr`). | Remove Privy from `TopBar`/`Providers`; standardize on canonical Supabase Auth + keyless `wagmi`/`viem` EIP-4361 SIWE (`walletLink.ts`). |
| **Active XSS & Fake Citations** | `src/app/api/debate/route.ts:14` + `src/app/issue/[id]/page.tsx:89` | Raw `question` interpolated into HTML rendered via `dangerouslySetInnerHTML` + hardcoded fake `"Congressional Budget Office"` citation. | Replace `/api/debate` with plain-text JSON grounded in `bills.summary_official`; delete `dangerouslySetInnerHTML`. |
| **Rootstock Chain `31` RPC** | Live JSON-RPC probes at block `8,282,078` (`public-node.testnet.rsk.co`, `drpc.org`) | 100-block avg block time = **`25.82s`**. `eth_getLogs` returns **`-32601`** on public node & **`code 19`** on dRPC. Cancun opcodes (`PUSH0`, `MCOPY`, `TSTORE`) **succeeded live**. | Ponder (`eth_getLogs`) cannot run on free public RSK RPCs; use OZ `GovernorStorage` (`eth_call`) now and Ponder on Alpha-Net. |
| **Installed Dependencies** | `package.json` + `node_modules` check | `@openzeppelin/contracts@^5.0.0` (`GovernorStorage.sol`), `@supabase/supabase-js@^2.91.0`, `@supabase/ssr@^0.8.0`, `viem@^2.52.2`, `wagmi@^2.14.11` installed. `drizzle-orm`, `kysely`, `zod`, `ponder` **not** installed. | Zero new npm packages needed for Wave 1 or Wave 2. |

---

## 3. Definitive Council Decisions (`D1–D4`, `Q1–Q3`)

1. **D1 (Schema Consolidation — Hybrid `1A/1B` Pre-Production Baseline)**:
   - Unpack `23f70bf`, move colliding `supabase/migration.sql` to `archive/sql-legacy/migration.sql`, and add `supabase/migrations/20261110000000_canonical_modular_schema.sql` before any production DB is created.
   - Enforces `chain_networks` (replacing `CHECK (chain_id IN (31))`), `ocd_id` on `jurisdictions`, unified `data_sources` (merging `api_sources`), `bills.search_tsv` GIN full-text index, unified `civic_proposals` (closing the `poll_votes` `USING (true)` ballot privacy leak), `dao_proposals` schema, `(SELECT auth.uid())` `initPlan` RLS policies + `user_id` B-tree indexes, strict owner-only `wallet_links` RLS (preventing EOA-to-`shadow_votes` de-anonymization), and `rls_auto_enable()` DDL event trigger.
2. **D2 (DB Access Layer — Option 2A)**:
   - Zero-ORM `@supabase/supabase-js` + `@supabase/ssr` + `supabase gen types typescript` + zero-dependency TypeScript input parsers (`parseVoteInput`-style validators).
3. **D3 (On-Chain Indexing — Option 3A + `DaoReader` Port)**:
   - `GovernancePlugin.sol` inherits `GovernorStorage`.
   - `src/modules/dao-chain/reader.ts` defines a `DaoReader` interface: Rootstock POC uses `GovernorStorageRpcReader` (`viem` `eth_call` + `revalidate: 15` HTTP/RSC cache + 2-block confirmation check, avoiding `service_role` cron drift); Alpha-Net plugs `PonderDbReader` (`dao_proposals`) into the identical interface.
4. **D4 (Data Chat — Option 4A)**:
   - Defer free-form LLM chat until post-DAO POC; remediate `/api/debate` XSS & fabricated citations immediately; ship Postgres `TSVECTOR` legislative search.
5. **Q1 (Bundle Integration)**:
   - Unpack `utp-first-cycle.bundle` (`23f70bf`) onto `feat/superpowers-civic-auth`, replacing unhardened untracked OAuth draft files, and commit Wave 1 fixes on top.
6. **Q2 (Rollout Sequence)**:
   - Wave 1 (DB + Auth + Civic) → Wave 2 (Rootstock Testnet `31` DAO POC, labeled Bitcoin-anchored EVM sidechain) → Wave 3 (UTP Alpha-Net). Custom STARK + ML-DSA-65 rollup stays gated on `G0–G4`.
7. **Q3 (Multi-Signer & Block-Time Calibration)**:
   - Require 4 distinct roles (`Deployer` → `0` votes post-setup, `Voter A` `250k`, `Voter B` `250k`, non-deployer `Guardian`).
   - `distribute-testnet.cjs` forwards `0.002 tRBTC` gas stipends from `Deployer` and asserts `ERC20Votes` `delegate()` (`getVotes >= 250_000e18`) **before** `propose()`.
   - `scripts/deploy.config.cjs` supports `RSK_TESTNET_VOTING_PERIOD` env override (`90` blocks ≈ `39m` for QA rehearsal; default `2880` blocks ≈ `20.7h`).

---

## 4. Acceptance Criteria & Verification Gates

- **Gate W1 (Local Branch & Disposable Postgres)**:
  - `npm run ci:fast` exits `0` (`0` lint errors, `0` TS errors, `>=107` Vitest web tests, `>=175` Hardhat tests).
  - `npm run test:db` exits `0` on macOS (`mbp-2023`) and Linux (`[self-hosted, linux, utp]`), asserting:
    1. Every `public` table has `relrowsecurity = true`.
    2. `anon` cannot read `poll_votes`, `civic_proposal_votes`, `shadow_votes`, or `wallet_links`.
    3. `wallet_links` accepts any active `chain_id` registered in `chain_networks` (e.g., `31` and a test Alpha-Net ID).
    4. Zero occurrences of `dangerouslySetInnerHTML`, `cm0q8k5xw000108jz7xk64b9a`, or fabricated CBO strings in `src/`.
- **Gate W2 (Rootstock Testnet `31` DAO POC)**:
  - `EvmCanary` + `UTPToken` + `UtPTimelock` + `GovernancePlugin` (`GovernorStorage`) + `AppConfig` deployed on Chain `31` with `deployments/rskTestnet.json` artifact.
  - Pre-proposal `getVotes(voterA) == 250_000e18`, `getVotes(voterB) == 250_000e18`, `getVotes(deployer) == 0`.
  - Proposal #1 (`AppConfig.setConfig`) passes 2-wallet quorum, executes via Timelock, and flips `/api/app-config` live; Proposal #2 cancelled by non-deployer `Guardian`.
- **Gate W3 (UTP Alpha-Net)**:
  - Alpha-Net chain row inserted into `chain_networks`; contracts deployed via `scripts/deploy.cjs`; Ponder indexer streams `ProposalCreated`/`VoteCast` into `dao_proposals`.
