# First-cycle evidence ledger

Plan: `docs/superpowers/plans/2026-11-03-utp-first-cycle-release-identity-civic.md`. Statuses: PASS / FAIL / NOT_RUN / BLOCKED / BLOCKED_ON_AUTH. Missing evidence is never PASS.

Environment: Claude cloud container (Linux, Node 22.23.4, npm 10.9.9, PostgreSQL 16 binaries, no Docker). Clone of `https://github.com/samtheloanman/utp` at `origin/master` `777658f`, branch `feat/first-cycle-auth-civic`. The canonical Mac checkout (`d81e60b`, dirty) was not modified; its uncommitted auth files and readiness docs were copied in read-only (provenance below).

| id | status | sha | command | exit | note |
|---|---|---|---|---|---|
| A-baseline-web | PASS | 777658f | `npm run lint && npm run typecheck && npm run test:web` (inside `npm run ci:fast`) | 0 | lint clean, typecheck clean, 2/2 web tests |
| A-baseline-contracts | PASS | 777658f | `SOLC_JS_PATH=<solc 0.8.24 soljson.js> npm run test:contracts` | 0 | 175 passing. Plain `ci:fast` fails here only because the sandbox cannot download solc (HH502 ENOTFOUND binaries.soliditylang.org) |
| A-zero-test-guard | PASS | 777658f | `npx vitest run src/__no_such_dir__` | 1 | Vitest exits non-zero when no test files are found |
| R2-vercel-production-target | BLOCKED_ON_AUTH | 777658f | Vercel MCP read tools (`get_project`, `list_deployments`, `list_project_domains`, `get_deployment`) | 403 | `forbidden` for scope `samtheloanmans-projects` (`team_D2rNpq3e1jGfA7HanfuwMX3O`); productionBranch and deployment targets NOT_DETERMINED. Needs Sam to authorize team access |
| I1-redirect | PASS | 54aadea | `npx vitest run src/lib/supabaseAuth` (redirect guard, callback, login, consent, decision tests; in final gate vitest) | 0 | same-origin `safeRedirectPath`; deferred: `/%5c`, double-encoded `/%252f%252f`, missing-code callback tests. Current-head: final gate below |
| I1-requireUser | PASS | 4e6eee2 | `npx vitest run` (requireUser tests; final gate) | 0 | cookie and Bearer paths via `getUser()`; deferred: thrown client => unhandled 500 (not fail-closed), transient network error reported 401 not 503 |
| C2-vote-integrity | PASS (shim DB) | 6892d49 | `npm run test:db` + `npx vitest run` (final gate) | 0 | authenticated `/api/vote`, one-vote-per-user-per-bill, advisory-locked aggregate recount, tamper test, concurrency on a throwaway PG16 cluster with an auth shim (Ruling P2). NOT real Supabase, see DB-on-real-Supabase |
| C2-propose | PASS (shim DB) | b38491c | `npm run test:db` + `npx vitest run` (final gate) | 0 | authenticated, bounded `/api/propose`; unique `source_url` index; GET hides `proposer_id`; legacy-table migration test. Needs preflights before remote apply (see Prepared external steps) |
| I1-wallet-link | PASS (shim DB) | 03cee70 | `npm run test:db` + `npx vitest run` (final gate) | 0 | SIWE-verified link/unlink; server HMAC attestation (`WALLET_LINK_SECRET`) checked in a SECURITY DEFINER RPC; wrong account / replayed nonce / forged signature rejected. EOA only: ERC-1271 unsupported; unlink has no fresh MFA (I2) |
| C1-federal | PASS (mocked) | 64f94ef | `npx vitest run` (adapter tests, final gate) | 0 | Congress.gov adapter, source URL, jurisdiction, version/`recordHash`, fetch time; provider failure never returns fixture as live. Live fetch NOT_RUN (no key) |
| C1-state | PASS (adapter on mocks) / BLOCKED (live) | 64f94ef | `npx vitest run` (adapter tests, final gate) | 0 / n/a | OpenStates adapter passes on mocks. Live ingestion BLOCKED: no OPENSTATES key provisioned |
| C1-local | BLOCKED | 64f94ef | none | n/a | Local-government denominator (Legistar clients, municipalities/counties) undecided: plan decision U2 |
| UI-honesty | PASS | 2b14387 | `npx vitest run` (UI tests, final gate) | 0 | sample content labelled "Sample data", votes gated on Supabase session, no sample-as-live; removed Privy gate and on-chain castVote from home feed (Ruling, Task 8) |
| DB-on-real-Supabase | NOT_RUN | n/a | `supabase start` / `supabase db reset` | n/a | no Docker (U1); `test:db` used a shim PG16 cluster (Ruling P2). Real-Supabase RLS/auth behaviour is unverified |

### Final gate, head `03cee70` (2026-11-03, this container)

| step | command | exit | result |
|---|---|---|---|
| lint | `npm run lint` | 0 | clean |
| typecheck | `npm run typecheck` | 0 | clean |
| web tests | `npx vitest run` | 0 | 21 files, 107 tests passed |
| build | `npm run build` | 0 | Next production build OK |
| db tests | `npm run test:db` | 0 | 4 files, 27 tests passed (shim PG16, not real Supabase) |
| contracts | `SOLC_JS_PATH=/tmp/solc824/node_modules/solc/soljson.js npm run test:contracts` | 0 | 175 passing |
| whitespace | `git diff --check` | 0 | clean |

Not covered by this gate: CI on the Dell runner for this head (branch not pushed), Vercel preview, any remote database, live provider calls, R2.

## Prepared external steps (awaiting Sam's authorization)

Nothing below has been executed. This session has read-only GitHub access and no linked Supabase project.

### a. Push and PR
```
git push -u origin feat/first-cycle-auth-civic
gh pr create --base master --head feat/first-cycle-auth-civic --title "First cycle: auth, civic ingestion, vote integrity, wallet link, UI honesty"
```
Sam or an authorized session runs these. `master` is protected: required checks must pass on the exact head (Dell runner `dell-utp-1`). Status: NOT_RUN.

### b. Migrations (apply in this order)
1. `20261104000000_vote_integrity.sql`
2. `20261104000100_wallet_links.sql`
3. `20261104000200_source_registry.sql`
4. `20261104000300_voting_proposals.sql`

`supabase db push --dry-run`: NOT_RUN (no linked project; target project undecided, plan decision U3). Run it before any real push, and only after Sam picks the target.

Preflights against the target database (read-only SQL):
- Duplicate non-empty source URLs, which would make the new unique index fail:
  `select source_url, count(*) from public.voting_proposals where coalesce(source_url,'') <> '' group by source_url having count(*) > 1;` must return no rows.
- Remote `voting_proposals` column shape: confirm via `information_schema.columns` that `description`, `bias_score`, `category` and the other columns the GET route selects exist (the explicit-column GET returns 500 if they do not).

### c. Secret provisioning (values never in the repo)
- `WALLET_LINK_SECRET`: Vercel environment variable, and the same key stored in `private.wallet_link_settings` via the SQL editor or Vault.
- `CONGRESS_API_KEY` and the OpenStates API key: in the approved secret stores. Until set, C1 live ingestion stays BLOCKED.
- `IP_SALT`: set in production (vote IP hashing).

### d. Vercel
Authorize team access for scope `samtheloanmans-projects` so the R2 investigation can read `productionBranch` and deployment targets (403 today). Sam's decision.

Stop after each step and wait for authorization.

## Provenance of imported files (from the Mac checkout, 2026-11-03)

Readiness docs `docs/testnet-readiness-2026-10-31/*.md` and `EVIDENCE.json`, and the plan file, were untracked on the Mac and are committed here unchanged. Auth files are imported in Task 2 and listed there with `git hash-object` values.

Task 2 imports (`git hash-object` of each SOURCE copy from the Mac checkout, before the redirect-guard edits; `.env.example` is copied verbatim):

| path | git hash-object (source) |
|---|---|
| `src/middleware.ts` | `bd4218fcdba534e2c06c8b0313df83142d5987a7` |
| `src/lib/supabaseAuth/client.ts` | `e02448c6bf797f8e63b60458bfae6db157307713` |
| `src/lib/supabaseAuth/server.ts` | `552ad0313a65ad8d3229e07eb54bb6764c1f8c85` |
| `src/app/auth/callback/route.ts` | `152b07bf7f094b052bed33d55e60b1dc3668af4c` |
| `src/app/login/page.tsx` | `e23ea872d40013f90a34678f77ea9b45398b81bd` |
| `src/app/oauth/consent/page.tsx` | `4f65b60056a772890486321a031f1679f9d85c50` |
| `src/app/api/oauth/decision/route.ts` | `4d3daaedf017741e36f14af1a8714b9646e756e5` |
| `.env.example` | `56a74122b110429f8934f8228af44bd12cdd9e11` |

Task 2 then modified `auth/callback/route.ts`, `login/page.tsx`, `oauth/consent/page.tsx` and `api/oauth/decision/route.ts` to use `safeRedirectPath` / `encodeURIComponent`, so committed blobs differ from these hashes for those four files.
