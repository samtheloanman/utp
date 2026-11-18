# UtP MVP execution plan — order, steps, methods

Date: 2026-11-17 · PRD: `docs/superpowers/specs/2026-11-17-utp-mvp-prd.md` · Base: `feat/superpowers-civic-auth` @ `28c73e8` (`2b94793` adds the Forgejo workflow)
State evidence: local `ci:fast` exit 0 (181 contract tests); clean node:20 container reproduction of `2b94793` exit 0; brain fact `865e8b86`.

## Methods used (fleet standard)

| Method | When | Output |
|---|---|---|
| **autoresearch** | Any decision touching external systems, data or security | `SPEC.md` covering live code and primary docs, alternatives, failure modes, a reversible experiment, an acceptance gate |
| **llm-council** (5 advisors, anonymous peer review, chairman) | Consequential or ambiguous choices only (marked ⚖ below) | `docs/council/council-<date>-<topic>.md` |
| **writing-plans → TDD (loop-exec)** | Every code slice | Failing test first, then the minimal change. At most 2 repair attempts, and stop on an identical repeat failure |
| **systematic-debugging** | Any red check | Root cause before the fix |
| **verification-before-completion** | Before any "done" | A receipt: command, exit code, counts, SHA |
| **requesting-code-review + Hermes** | Before every PR goes to GitHub | Review on the exact head |

Branch per wave: `claude/UTP-<n>-<slug>` in a new `git worktree`. One Paperclip issue per wave, claimed before work starts. Merges are done by the automerge bot or Sam only.

## Critical path

```
W0 baseline ─┬─> W1 platform ─┬─> W2 civic ─────────────┐
             │                └─> W3 governance UI ─────┼─> W5 Alpha (fleet E2E)
             └─> W4a signer manifest/keys ─> W4b deploy ┘
```
W2 and W3 run in parallel (separate worktrees and agents). W4a starts in parallel with W1 because it is mostly custody setup.

---

## W0 — Baseline and delivery path (blocks everything)

1. **Unblock CI access** (🔒 Sam): add `claude` to `codex-utp/utp-staging`, or paste the log for run 2. Rotate the token in the `forgejo` remote URL and reset the remote to the HTTPS URL with a credential helper.
2. **systematic-debugging** on run 2: read the first failing step. Expected suspects, in order: the `node-20` runner label is not registered → the runner cannot reach github.com for `actions/checkout` → an arch mismatch. Fix only the root cause, either in the workflow (`runs-on` set to the label the runner really has, checkout pinned to the Forgejo mirror) or in the runner config.
3. Bind the protected-branch required status check to the real job name `verify`.
4. Get a Hermes review (`hermes-utp`) on the exact head. Never synthesize this status.
5. **Hygiene commit:** remove `UTP.zip`, `design.tar.gz`, the LMArena PDF and `temp_*` from git (into `archive/` or deleted), and repoint `CLAUDE.md` and `AGENTS.md` to the PRD. Commit the PRD and this plan.
6. Promote: push the verified head to GitHub, open the consolidated PR, write a supersession map against #22 (`git range-diff 777658f..23f70bf 777658f..HEAD`), then close #22. 🔒 Push and PR need authorization.

**Gate:** the same SHA is green on Forgejo `verify` and the GitHub required checks (Dell `[self-hosted, linux, utp]`), Hermes has approved, and #22 is closed with the map.

## W1 — Platform wiring

1. **autoresearch** (short): Supabase Google OAuth setup, redirect URLs for preview and production, cookie domain. Source: Supabase docs plus the live project `tuajgdhslxqmiaehsend` config (read-only).
2. Write failing tests first: callback route with Google provider state, `requireUser` on every write route (table test over the routes), degraded mode when env vars are missing (FR-9).
3. 🔒 Config: Google OAuth client, Supabase provider, secrets `WALLET_LINK_SECRET`, `CONGRESS_API_KEY`, `OPENSTATES_API_KEY`, `IP_SALT` in GCP Secret Manager → Vercel env. Never in files.
4. Vercel project linked to the repo; preview deploys only (production stays gated).
5. Supabase security and performance advisors: zero errors.

**Gate:** on the preview URL, a fleet test account completes Google sign-in → SIWE wallet link → unlink. RLS check: user A cannot read B's `wallet_links`.

## W2 — Civic data at scale (OCD-ID + platform adapters)

1. ⚖ **autoresearch → council: platform census and adapter order.**
   - Census: for all 58 CA counties, CA cities over 100k, and the 50 largest US cities and counties, record the agenda platform (Legistar, PrimeGov, CivicClerk, Granicus, BoardDocs, custom), whether an API or feed exists, terms of use and rate limits.
   - Council question: which adapter order maximizes covered population per engineering week, and what is the stale/unknown policy?
   - Output: `docs/council/council-2026-11-xx-jurisdiction-scaling.md` plus a `coverage-census.csv` seed.
2. Schema migration (TDD with `test:db`): the `jurisdictions` table keyed by `ocd_id` with `platform`, `platform_client`, `coverage_status` (live / partial / none) and `last_success_at`. 🔒 The migration needs authorization to apply.
3. Adapter interface (`src/lib/civic/adapters/`): `listMatters(since)`, `getMatter(id)` → normalized `Bill` with `source_url`, `fetched_at`, `content_hash`. Contract test suite shared by all adapters (fixture-based, real recorded responses).
4. **Legistar adapter first** (most likely to cover the most population; the council confirms). Idempotent upsert keyed on `(ocd_id, source_id)`. Test: a re-run produces 0 new rows.
5. Ingestion scheduler: Vercel cron or Dell job, with per-platform rate limiting and backoff. Writes `coverage_status` and `last_success_at`.
6. Citations (FR-4): the summary pipeline rejects output with no citation and labels it `unverified`. Negative tests.
7. Issue page: evidence / analysis / sentiment sections, freshness badge, a public coverage page at `/coverage`.

**Gate:** every target jurisdiction has a coverage status, at least one adapter is live with real data, and tests pass for jurisdiction mismatch, stale data, uncited output and idempotency.

## W3 — Governance UI

1. **writing-plans** from FR-6 to FR-8. Reuse the `DaoReader` port (`src/modules/dao-chain/`) with a 15 s revalidate and a 2-block confirmation (council 2026-11-10).
2. TDD the component state machine: Pending → Active → Succeeded/Defeated → Queued → Executed. Buttons appear only in valid states, and a test shows Defeated has no queue button.
3. `/token`: balance, `delegate(self)`, voting power at the snapshot. Warn when undelegated (the council's snapshot trap).
4. Proposal create: threshold precheck, description `utp:issue=<id>;evidence=<sha256>`, two-way link with the issue.
5. Vote labels: Sentiment / Wallet-signed / Binding on every surface. A snapshot test enforces it.
6. Local-chain E2E: Hardhat node, deploy-core, Playwright run of propose → vote → queue → execute.
7. a11y check (WCAG AA) on `/governance` and `/token`.

**Gate:** component tests pass, the local-chain Playwright E2E is green, a11y has 0 serious issues.

## W4 — Rootstock testnet

**W4a (parallel with W1)**
1. Generate 4 role EOAs (Deployer, Voter A, Voter B, Guardian), each held by a different fleet agent. Private keys go only into GCP Secret Manager `cgc-1-places`. 🔒 Creating secrets needs authorization.
2. Public `deployments/signer-manifest.json` with addresses and roles only.
3. Fund from the tRBTC faucet. Gas estimate from the local rehearsal (`scripts/smoke-governance.cjs`).

**W4b (after W0 and W4a)**
4. Rehearse again on a local node with the exact config and `RSK_TESTNET_VOTING_PERIOD=90`.
5. 🔒 Broadcast through `.github/workflows/deploy-rsk-testnet.yml` (Dell runner, `rsk-testnet` environment).
6. Verify source on the explorer. Commit `deployments/rskTestnet.json`.
7. Distribute 250k UTP each to Voter A and B. Both `delegate(self)`. Assert `getVotes >= 250k` **before** propose. The Deployer ends with 0 votes.
8. On-chain acceptance: one proposal passes and executes, one is defeated, one queued proposal is cancelled by the Guardian. Record tx hashes in the evidence ledger.
9. Write the runbook: `docs/runbooks/rsk-testnet.md` (deploy, verify, distribute, veto, redeploy).

**Gate:** the 3 lifecycle outcomes are verified on chain 31 with tx hashes.

## W5 — Fleet Alpha

1. Fleet personas: each agent (Claude Code, Codex, Gemini, Hermes, Paperclip) gets a Google test account plus a wallet, scripted through Playwright against the preview build and testnet. Hermes or Paperclip schedules the runs (one scheduler only).
2. Full-flow E2E on the Dell CI: sign in → link → sourced CA issue → sentiment vote → proposal from the UI → at least 3 wallets vote binding → queue → execute.
3. Rate limits on write APIs (per user and per hashed IP) with tests. Structured logs and an error alert.
4. Perf check: LCP under 2.5 s on the issue page.
5. **verification-before-completion** receipt against the §1 PRD success metric.
6. 🔒 Human CA invites.

**Gate:** the PRD §1 metric is met with evidence links.

---

## Authorization gates (🔒) summary

| Gate | Wave |
|---|---|
| Forgejo staging access + token rotation | W0 |
| Push / PR to GitHub | W0, each wave |
| Google OAuth, Supabase provider, secrets, Vercel | W1 |
| Supabase migration apply | W2 |
| Signer key creation + funding | W4a |
| Testnet broadcast | W4b |
| Human invites | W5 |

## Next action

W0 step 1: Sam grants `claude` read access to `codex-utp/utp-staging` (or pastes the run 2 log). Meanwhile, start W2 step 1 (census autoresearch). It is read-only and not blocked.
