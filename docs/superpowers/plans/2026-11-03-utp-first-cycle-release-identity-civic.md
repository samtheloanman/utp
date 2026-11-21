# UTP First Cycle (R2 + I1 + C1 + vote hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move UTP from "merged and deployed civic shell" to a tested civic slice: one canonical Supabase account, authenticated and race-safe shadow votes, server-verified wallet linking, and a federal source adapter that reports `unavailable` instead of serving fixtures.

**Architecture:** Next.js 15 route handlers over Supabase Auth/Postgres/RLS. `auth.users.id` is the canonical civic account; Privy/Wagmi stays as the wallet connector only. Pure, injectable modules (`redirect`, `requireUser`, `walletLink`, `SourceAdapter`) carry the logic so Vitest covers them without network; DB behavior (RLS, aggregates, nonce consumption) is proven against a disposable local Supabase stack.

**Tech Stack:** Next 15, React 19, TypeScript, Vitest 4 + Testing Library, `@supabase/ssr` + `supabase-js` 2.91, viem 2.52 (`viem/siwe`), Supabase CLI (already a devDependency), Hardhat (contracts, untouched this cycle).

**Spec:** `docs/testnet-readiness-2026-10-31/SPEC.md` (criteria A, B-partial), `AUTH-CUSTODY-BITCOIN-STACK.md` (slices 1-2), `MERGE-AND-IMPLEMENTATION-LOOP.md` (backlog R2, I1, C1, first step of C2), `CLAIM-AUDIT.md` (R6). Executors read these first.

## Global Constraints

- Dell-only CI: `runs-on: [self-hosted, linux, utp]`; never a GitHub-hosted runner.
- Missing evidence is `NOT_RUN` or `BLOCKED`, never `PASS`. Record SHA, command, exit code per acceptance item.
- No production money or real BTC; testnet chain ID is 31; optional PQ mode stays off; no claim of private voting, quantum safety, or custom L2.
- Mainnet, provider/environment changes, migrations against remote databases, deployment, external messages, pushes and merges each need their own authorization. This plan prepares them and stops; nothing in it authorizes them.
- Secrets stay in approved stores. No secret, token or private ballot in logs, tests, fixtures or Brain.
- No new dependency, skill, plugin or MCP without required scanning. This plan adds none (viem, @supabase/ssr, vitest, supabase CLI already present).
- Preserve unrelated work: never reset, clean or blanket-stage `/Users/maysamtehranchi/Code/utp`. Implement in an isolated worktree.
- `npm run test:web` must stay nonempty (it exits 1 on zero test files; Task 0 proves this).
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SSjN64Ve8j6CJk4iVbbJJV`

## Review Focus

Failure modes the spec implies but no existing test exercises, most likely first. Each has its pinning test in the owning task.

1. `redirect` query on `/auth/callback` built as `` `${origin}${redirectTo}` `` — `@evil.com` or `.evil.com` yields an off-site redirect. Expected: always same-origin path or `/` (Task 2).
2. `/api/vote` trusting body fields and using a service-role client: non-UUID `billId`, vote outside `for|against|unsure`, or a body-supplied `user_id` must never write another user's row; missing Supabase env must fail closed, not run against `placeholder.supabase.co` (Task 4).
3. Concurrent vote changes leaving `vote_aggregates` different from a recount; no trigger or function in any repo migration updates it today (Task 4).
4. Provider outage or missing `CONGRESS_API_KEY` rendering hardcoded bills (`us-hr4763` etc.) as live (Task 7).
5. Wallet challenge replay across accounts, chains or origins, and address-case duplicates (`0xAbC…` vs `0xabc…`) bypassing uniqueness (Task 6).

## Verified starting state (2026-11-03, read-only)

- `origin/master` = `777658f` (last fetch known to the Mac; the cloud shell could not fetch, so Task 0 re-fetches).
- Canonical checkout: local `master` at `d81e60b`, ahead 2 (skills/gitignore commits), behind 1. Uncommitted: Supabase OAuth work (`src/middleware.ts`, `src/lib/supabaseAuth/*`, `src/app/{auth,login,oauth}`, `src/app/api/oauth`), `.env.example`, `AGENTS.md`, `CLAUDE.md`, `package.json` (+`@supabase/ssr`), lockfile, `docs/`.
- `ci:fast` = lint, typecheck, `test:web` (2 dedup tests), `test:contracts` (175 on the merged baseline per `MERGE-AND-IMPLEMENTATION-LOOP.md`).
- Stale and to be corrected in Task 9: `.gsd/STATE.md` (June: 128 passing / 14 failing) and the Project doc `claude/WORKSPACE-MAP.md` (lists #20/#21 as open).
- Code facts found: `src/app/api/vote/route.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and unvalidated body; `src/app/api/propose/route.ts` has no auth, unbounded `limit`, and targets `voting_proposals`, which no repo migration creates; `src/app/api/legislature/route.ts` falls back to hardcoded bills and serves static EU/BR/IN entries; `src/lib/data.ts` issues are synthetic; the issue-page `VotePanel` gates on Privy and keeps votes in `localStorage('utp_votes')`; two conflicting schemas exist (`supabase/migration.sql` legacy vs `supabase/migrations/*`); `shadow_votes` has insert/select RLS but no update policy.
- Brain (Cloudflare D1 `cowork_sessions`) holds no UTP-specific engineering entries; this plan's source of truth is the repo docs above.

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/supabaseAuth/redirect.ts` (new) | `safeRedirectPath` |
| `src/lib/supabaseAuth/requireUser.ts` (new) | Resolve user from cookie session or bearer token |
| `src/lib/supabaseAuth/{client,server}.ts`, `src/middleware.ts`, `src/app/{auth,login,oauth}`, `src/app/api/oauth` | Imported from dirty checkout, then hardened |
| `src/lib/votes/parseVoteInput.ts` (new) | Validate vote payload |
| `src/app/api/vote/route.ts`, `src/app/api/propose/route.ts` | Auth + validation + user-scoped client |
| `src/lib/wallet/walletLink.ts`, `src/lib/wallet/store.ts` (new) | Challenge/verify logic and store interface |
| `src/app/api/wallet/{challenge,link}/route.ts` (new) | HTTP surface |
| `src/lib/civic/{types,freshness,congress}.ts` (new) | `SourceAdapter`, status model, federal adapter |
| `src/app/api/legislature/route.ts`, `src/app/legislature/page.tsx` | Honest status; no fixtures |
| `src/components/ui/DataStatusBadge.tsx` (new) | live / stale / unavailable / sample label |
| `supabase/migrations/20261104000000_vote_integrity.sql`, `…0100_wallet_links.sql`, `…0200_source_registry.sql`, `…0300_voting_proposals.sql` (new) | Schema, RLS, triggers |
| `scripts/test-db.sh`, `vitest.db.config.ts`, `test-db/*.test.ts` (new) | Disposable-DB suite (`npm run test:db`) |

---

### Task 0: Preflight, isolated worktree, stale-doc inventory

**Files:** Create `docs/testnet-readiness-2026-10-31/EVIDENCE-LEDGER.md` (in the worktree). No code.

**Interfaces:** Produces: worktree path `~/Code/utp-wt/first-cycle` on branch `feat/first-cycle-auth-civic` from verified `origin/master`; ledger table with columns `id | status | sha | command | exit | note` used by every later task.

- [ ] **Step 1: Fetch and record heads** — on the Mac run `git fetch origin && git rev-parse origin/master` and `git status -sb`. Expected: origin/master is `777658f` or a recorded successor; record both SHAs and the dirty-file list in the ledger.
- [ ] **Step 2: Create the worktree** — `git worktree add ~/Code/utp-wt/first-cycle -b feat/first-cycle-auth-civic origin/master`. Expected: clean `git status`; dirty checkout untouched (`git -C ~/Code/utp status -sb` unchanged).
- [ ] **Step 3: Baseline** — in the worktree `npm ci && npm run ci:fast`. Expected: exit 0, 2 web tests, 175 contract tests. Record SHA and counts as ledger row `A-baseline`.
- [ ] **Step 4: Prove the zero-test guard** — `npx vitest run src/__no_such_dir__`. Expected: exit 1 ("No test files found"). Record as `A-zero-test-guard`.
- [ ] **Step 5: Commit the ledger** — `git add docs/testnet-readiness-2026-10-31/EVIDENCE-LEDGER.md && git commit -m "docs: add first-cycle evidence ledger"` (with trailers).

### Task 1: R2 — why Git integration built `master` as Preview (read-only finding)

**Files:** Modify `docs/testnet-readiness-2026-10-31/MERGE-AND-IMPLEMENTATION-LOOP.md` (R2 row, evidence section).

**Interfaces:** Consumes the Vercel MCP read tools (`get_project`, `list_deployments`, `get_deployment`). Produces: a dated finding stating the project's production branch setting and which deployments carry `target: production`; a reviewable proposed change if the setting is wrong.

- [ ] **Step 1: Read project config** — `get_project` for the UTP project; record `link.productionBranch` (or equivalent), Git-connected repo, and whether auto-assign production domains is enabled.
- [ ] **Step 2: Compare deployments** — `list_deployments` filtered to the project; record `target` for `777658f` (Git-built, Preview) and `dpl_b2mSdYBpPc48gJGtTzxPjgeMryS9` (manual, production). Expected finding: a concrete cause (branch name mismatch, custom environment, or ignored-build step) or `NOT_DETERMINED` with what was checked.
- [ ] **Step 3: Write the finding** — add it to the R2 section with the exact setting and proposed change. **Do not change any Vercel setting**; changing project/environment settings needs Sam's authorization. Mark R2 `BLOCKED_ON_AUTH` if a change is required.
- [ ] **Step 4: Commit** — `git add docs/... && git commit -m "docs: record Vercel production-target finding (R2)"`.

### Task 2: Import Supabase auth work and fix redirect handling (I1, slice 1)

**Files:**
- Create: `src/lib/supabaseAuth/redirect.ts`, `src/lib/supabaseAuth/redirect.test.ts`, `src/app/auth/callback/route.test.ts`
- Import (copy from dirty checkout, record `git hash-object` of each in the ledger): `src/lib/supabaseAuth/{client,server}.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts`, `src/app/login/page.tsx`, `src/app/oauth/consent/page.tsx`, `src/app/api/oauth/decision/route.ts`
- Modify: `package.json` (+`"@supabase/ssr": "^0.8.0"`), `package-lock.json` via `npm install`, `.env.example` (take the dirty checkout's hunk)

**Interfaces:** Produces `safeRedirectPath(raw: string | null | undefined): string` — returns a same-origin path (+search+hash) or `'/'`. Callers build URLs as `new URL(safe, origin)`.

- [ ] **Step 1: Write failing tests** (`redirect.test.ts`):
```ts
import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';
describe('safeRedirectPath', () => {
  it.each(['@evil.com', '.evil.com', '//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/%2f%2fevil.com', '/ok\nSet-Cookie:x', '', null, undefined])
    ('rejects %s', (v) => expect(safeRedirectPath(v as string)).toBe('/'));
  it('keeps same-origin path, query and hash', () =>
    expect(safeRedirectPath('/oauth/consent?authorization_id=a%20b#x')).toBe('/oauth/consent?authorization_id=a%20b#x'));
});
```
`route.test.ts`: mock `@/lib/supabaseAuth/server` so `exchangeCodeForSession` resolves `{ error: null }`; call `GET(new Request('https://utp.test/auth/callback?code=c&redirect=@evil.com'))`; assert `new URL(res.headers.get('location')!).origin === 'https://utp.test'`. Add a second case where exchange errors: location is `/login?error=…` on the same origin.
- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/supabaseAuth src/app/auth` → FAIL (module missing / off-site redirect).
- [ ] **Step 3: Implement `safeRedirectPath`** in `redirect.ts`: accept only strings starting with a single `/`, reject `//`, backslashes, control characters, and anything where `new URL(raw, 'http://x.invalid').origin !== 'http://x.invalid'`; decode-once check so `/%2f%2f…` is rejected.
- [ ] **Step 4: Import files and apply the helper** — copy the listed files into the worktree; in `callback/route.ts` replace string concatenation with `NextResponse.redirect(new URL(safeRedirectPath(redirectParam), origin))`; in `login/page.tsx` run `safeRedirectPath` on the `redirect` search param before putting it in `callbackUrl`; in `api/oauth/decision/route.ts` wrap every interpolated `authorizationId` in `encodeURIComponent`.
- [ ] **Step 5: Run** — `npm run lint && npm run typecheck && npx vitest run` → exit 0, new tests pass.
- [ ] **Step 6: Commit** — `git add` the listed paths only; `git commit -m "feat(auth): import Supabase session/OAuth work with same-origin redirect guard"`.

### Task 3: `requireUser` — one way to resolve the civic account

**Files:** Create `src/lib/supabaseAuth/requireUser.ts`, `requireUser.test.ts`.

**Interfaces:** Consumes `createClient()` from `server.ts`. Produces:
`requireUser(req: Request): Promise<{ user: { id: string }; accessToken: string } | { error: Response }>` — reads `Authorization: Bearer` first, else the cookie session; returns `{ error }` with status 401 (`{message:'Unauthorized'}`) when neither validates, 503 when `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are unset (no `placeholder` fallback).

- [ ] **Step 1: Failing tests** — (a) no header and no session → 401; (b) invalid bearer (mock `auth.getUser` returns error) → 401; (c) valid bearer → `user.id` equals mock id and `accessToken` echoed; (d) env unset → 503 and `getUser` never called.
- [ ] **Step 2: Run** `npx vitest run src/lib/supabaseAuth/requireUser.test.ts` → FAIL.
- [ ] **Step 3: Implement** with `createClient` from `@supabase/supabase-js` using the anon key for bearer validation (`auth.getUser(token)`); never accept a user id from the body.
- [ ] **Step 4: Run** → PASS; **Step 5: Commit** `feat(auth): add requireUser session resolver`.

### Task 4: Vote API and integrity migration (C2 prerequisite)

**Files:**
- Create: `src/lib/votes/parseVoteInput.ts`, `src/lib/votes/parseVoteInput.test.ts`, `src/app/api/vote/route.test.ts`, `supabase/migrations/20261104000000_vote_integrity.sql`, `scripts/test-db.sh`, `vitest.db.config.ts`, `test-db/vote-integrity.test.ts`
- Modify: `src/app/api/vote/route.ts`, `package.json` (`"test:db": "bash scripts/test-db.sh"`)

**Interfaces:** Consumes `requireUser` (Task 3). Produces `parseVoteInput(body: unknown): { ok: true; billId: string; vote: 'for'|'against'|'unsure' } | { ok: false; message: string }`; SQL function `verify_vote_aggregates()` returning one row per bill whose `vote_aggregates` differs from a recount (empty = consistent).

- [ ] **Step 1: Failing unit tests** — `parseVoteInput`: rejects non-object, non-UUID `billId`, vote `'maybe'`, and ignores any `user_id`/`userId` key (returned object has only `billId`, `vote`). Route tests (mock `requireUser` and `@supabase/supabase-js`): 401 passthrough; 400 for invalid input with no DB call; success path calls `upsert` once with `user_id` equal to the session user and `onConflict: 'bill_id,user_id'` even when body contains `user_id: 'someone-else'`; the client is constructed with the **anon** key and the caller's `Authorization` header, never `SUPABASE_SERVICE_ROLE_KEY`; production with `IP_SALT` unset → 503.
- [ ] **Step 2: Failing DB tests** (`test-db/vote-integrity.test.ts`, run against local stack): (a) user B cannot select, update or delete user A's vote; anon cannot insert; (b) 50 concurrent upserts by one user on one bill leave exactly one `shadow_votes` row; (c) 20 users voting concurrently with random choices, then 10 changing their vote: `verify_vote_aggregates()` returns zero rows and `total_votes` equals row count; (d) changing a vote moves one count between buckets; deleting a user's vote decrements.
- [ ] **Step 3: Run to verify failure** — `npx vitest run src/lib/votes src/app/api/vote` → FAIL; `npm run test:db` → FAIL (no trigger, no update policy).
- [ ] **Step 4: Implement migration** `vote_integrity.sql`: add `FOR UPDATE` and `FOR DELETE` policies on `shadow_votes` (`auth.uid() = user_id`); `AFTER INSERT OR UPDATE OR DELETE` trigger `apply_vote_aggregate()` (SECURITY DEFINER, `search_path` pinned) that first takes `pg_advisory_xact_lock(hashtext(bill_id::text))`, then recomputes counts for the affected bill(s) from `shadow_votes` and upserts `vote_aggregates` — recompute, not increment, and lock before counting so concurrent transactions cannot overwrite each other with stale counts; define `verify_vote_aggregates()`; revoke direct write on `vote_aggregates` from `anon, authenticated`.
- [ ] **Step 5: Implement** `parseVoteInput` and rewrite `route.ts`: `requireUser` → `parseVoteInput` → user-scoped client → upsert; remove the service-role client and the `placeholder` fallbacks; return generic 500 text (no raw DB error to caller).
- [ ] **Step 6: `scripts/test-db.sh`** — `supabase start`, `supabase db reset`, run `vitest run --config vitest.db.config.ts`, `supabase stop` (always, via trap). Requires Docker; not added to `ci:fast` until Dell's Docker availability is confirmed (open decision U1).
- [ ] **Step 7: Run** `npm run ci:fast && npm run test:db` → exit 0 (record `test:db` as `NOT_RUN` if Docker is unavailable; never PASS).
- [ ] **Step 8: Commit** — migration, route, helper, tests, scripts. **Remote migration is not applied**; prepare `supabase db push --dry-run` output in the ledger and stop for authorization.

### Task 5: Propose API — auth, limits, and the missing table

**Files:** Modify `src/app/api/propose/route.ts`; create `src/app/api/propose/route.test.ts`, `supabase/migrations/20261104000300_voting_proposals.sql`.

**Interfaces:** Consumes `requireUser`. Produces table `voting_proposals(id uuid pk, title text not null, description text, source_url text unique, bias_score text, category text, status text default 'active', proposer_id uuid references auth.users, created_at)` with RLS: public select, insert only where `proposer_id = auth.uid()`.

- [ ] **Step 1: Failing tests** — POST without auth → 401; empty/over-200-char title → 400; `sourceUrl` not `http(s)` → 400; duplicate `source_url` → 409; insert payload `proposer_id` equals session user and never `votes_for/votes_against` from the body; GET `limit=100000` is clamped to 50 and `limit=abc` falls back to 20.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** route changes (user-scoped client as in Task 4) and the migration (no remote apply). **Step 4: Run** `npm run ci:fast` → PASS. **Step 5: Commit** `feat(api): authenticate and bound /api/propose`.

### Task 6: Wallet link — server challenge and signature verification (I1, slice 2)

**Files:** Create `src/lib/wallet/{walletLink.ts,store.ts,walletLink.test.ts}`, `src/app/api/wallet/challenge/route.ts`, `src/app/api/wallet/link/route.ts`, route tests, `supabase/migrations/20261104000100_wallet_links.sql`, `test-db/wallet-links.test.ts`.

**Interfaces:** Consumes `requireUser`. Produces:
```ts
export const ALLOWED_LINK_CHAINS = [31] as const;
export function normalizeAddress(a: string): `0x${string}`;            // throws on invalid; lowercases
export interface WalletLinkStore {
  putChallenge(c: Challenge): Promise<void>;
  consumeChallenge(nonce: string, userId: string, now: Date): Promise<Challenge | null>; // atomic, single use
  activateLink(l: { userId: string; chainId: number; address: string; assurance: 'aal1'|'aal2' }): Promise<'ok'|'address_taken'>;
}
export function createWalletChallenge(i: { userId: string; address: string; chainId: number; origin: string; now?: Date }, store: WalletLinkStore): Promise<{ message: string; nonce: string; expiresAt: string }>;
export function verifyWalletLink(i: { userId: string; message: string; signature: `0x${string}`; origin: string; now?: Date }, store: WalletLinkStore): Promise<{ ok: true } | { ok: false; reason: 'unknown_nonce'|'expired'|'replayed'|'wrong_origin'|'wrong_chain'|'wrong_user'|'bad_signature'|'address_taken' }>;
```
Messages are ERC-4361 text built and parsed with `viem/siwe`; TTL 10 minutes. `assurance` is stored so tiered proofing (I2) can later filter; AAL2 enforcement is explicitly **not** part of this cycle.

- [ ] **Step 1: Failing unit tests** (in-memory store, `privateKeyToAccount` test keys generated in the test): happy path links; replayed nonce → `replayed`; nonce issued to user A used by user B → `wrong_user`; signature by a different key → `bad_signature`; domain `evil.test` vs origin `utp.test` → `wrong_origin`; chain 1 → `wrong_chain` at challenge time (throws) and at verify time; expired by 11 minutes → `expired`; mixed-case address and its lowercase form both map to the same link, so a second account linking either casing → `address_taken`.
- [ ] **Step 2: Failing DB tests** — two users racing 20 parallel `consumeChallenge` calls on one nonce: exactly one non-null; two users racing `activateLink` for one `(chain_id, address)`: exactly one `ok`, one `address_taken`; unlinked wallet without a Supabase session cannot read `wallet_links` of others (RLS).
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement migration**: `wallet_link_challenges(nonce pk, user_id, chain_id, address, domain, expires_at, consumed_at)`; `wallet_links(id, user_id, chain_id, address, assurance, status check in ('active','revoked'), verified_at)` with partial unique index on `(chain_id, address) where status='active'`; SQL function `consume_wallet_challenge(nonce, user_id)` using `UPDATE … WHERE consumed_at IS NULL AND expires_at > now() RETURNING …`; RLS select-own only; writes only through service-side functions.
- [ ] **Step 5: Implement** `walletLink.ts`, a Supabase-backed `store.ts`, and the two routes (challenge: authenticated, returns message; link: authenticated, verifies, returns `{ ok }` with 409 for `address_taken`, 400 otherwise, without echoing internals).
- [ ] **Step 6: Run** `npm run ci:fast && npm run test:db` → PASS (or `NOT_RUN` for DB with reason). **Step 7: Commit** `feat(auth): server-verified wallet linking`. No remote migration applied.

### Task 7: Source registry and federal adapter; no fixtures in live mode (C1)

**Files:** Create `src/lib/civic/{types.ts,freshness.ts,congress.ts}` and `*.test.ts`, `supabase/migrations/20261104000200_source_registry.sql`; modify `src/app/api/legislature/route.ts`, `src/app/legislature/page.tsx`.

**Interfaces:** Produces
```ts
export type SourceStatus = 'live' | 'stale' | 'unavailable' | 'not_integrated';
export interface CivicBill { externalId: string; jurisdictionCode: string; number: string; title: string; status: string; introducedDate: string | null; sourceUrl: string; recordHash: string }
export interface SourceResult<T> { status: SourceStatus; items: T[]; fetchedAt: string | null; source: { name: string; url: string }; error?: string }
export interface SourceAdapter { id: string; jurisdictionCode: string; fetchBills(o: { limit: number; signal?: AbortSignal }): Promise<SourceResult<CivicBill>> }
export function classifyFreshness(fetchedAt: string | null, now: Date, maxAgeMs: number): 'live' | 'stale' | 'unavailable';
export function congressAdapter(d: { apiKey?: string; fetch?: typeof fetch; now?: () => Date }): SourceAdapter;
```
`recordHash` = SHA-256 of canonical JSON `{externalId, updateDate, latestActionText}`; it identifies the fetched record state, **not** a bill-text version (text-version hashing is a later task and must not be advertised yet).

- [ ] **Step 1: Failing tests** — `congressAdapter`: no `apiKey` → `status:'unavailable'`, `items:[]`; HTTP 500 → `unavailable`; thrown network error → `unavailable`; malformed JSON → `unavailable`; 200 with two bills → `status:'live'`, every item has non-empty `sourceUrl`, `fetchedAt` equals injected clock, and none of the ids `us-hr4763`, `us-s2281`, `us-hr5121` appear; identical input yields identical `recordHash`, changed `latestAction` yields a different one. `classifyFreshness`: null → `unavailable`; older than `maxAgeMs` → `stale`. Route test: `GET /api/legislature?country=EU` → `status:'not_integrated'`, `items:[]`; `country=US` with the adapter mocked unavailable → no hardcoded bill in the body.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the types, adapter and rewrite the route: delete `getFallbackUSBills` and the static EU/BR/IN arrays; UK keeps its live fetch but is wrapped in `SourceResult`; response adds `status`, `source`, `fetchedAt`; update `legislature/page.tsx` to read the new shape and show `DataStatusBadge` (Task 8).
- [ ] **Step 4: Migration** `source_registry.sql` — widen `jurisdictions.type` check to include `'local'`; add to `data_sources`: `jurisdiction_id`, `adapter_status text check in ('live','stale','blocked','not_integrated') default 'not_integrated'`, `last_attempt_at`, `last_error`; create `ingest_failures(id, source_id, external_id, error, payload_hash, created_at, resolved_at)` and `bill_versions(id, bill_id, record_hash, fetched_at, unique(bill_id, record_hash))`. Mark `supabase/migration.sql` as legacy in a header comment only; do not delete it.
- [ ] **Step 5: Run** `npm run ci:fast` → PASS. **Step 6: Commit** `feat(civic): source adapter model and federal slice; remove live-mode fixtures`.
- [ ] **Step 7 (state slice, adapter only):** add `openStatesAdapter` for California with the same tests and mocked fetch; a live run stays `BLOCKED` until an OpenStates key exists in an approved store. Local slice (Legistar) is `BLOCKED` on decision U2.

### Task 8: UI honesty and Supabase-gated voting

**Files:** Create `src/components/ui/DataStatusBadge.tsx` and test; modify `src/app/issue/[id]/page.tsx`, `src/app/legislature/page.tsx`, `src/lib/data.ts` (add `isSample: true` to every synthetic issue).

**Interfaces:** Produces `<DataStatusBadge status={SourceStatus | 'sample'} fetchedAt?: string|null />` rendering the literal labels `Live`, `Stale`, `Unavailable`, `Not integrated`, `Sample data`.

- [ ] **Step 1: Failing tests** (Testing Library): each status renders its label; `unavailable` never renders item counts; issue page for a synthetic issue shows `Sample data`; `VotePanel` with no Supabase session redirects to `/login?redirect=/issue/<id>`; with a session it `fetch`es `POST /api/vote` with `Authorization: Bearer <token>` and body `{ billId, vote }`; a 401 shows an error and does not set the selected vote; `localStorage` is never written as a vote of record.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** badge and `VotePanel` change: session from `createClient()` (`supabaseAuth/client`), not Privy `authenticated`; copy changes from "On-chain shadow vote · one voice per verified wallet" to "Civic test vote · signed-in account" (no verified-wallet claim until linking and eligibility are tested).
- [ ] **Step 4: Run** `npm run ci:fast && npm run build` → exit 0. **Step 5: Commit** `feat(ui): label sample data, gate votes on Supabase session`.

### Task 9: Evidence, docs and handoff

**Files:** Modify `.gsd/STATE.md`, `docs/testnet-readiness-2026-10-31/{EVIDENCE-LEDGER.md,MERGE-AND-IMPLEMENTATION-LOOP.md,IMPLEMENTATION-PROMPT.md}`; update Project doc `claude/WORKSPACE-MAP.md`; write Brain handoff.

- [ ] **Step 1: Ledger** — fill every row (A-baseline, R2, I1-redirect, I1-wallet, C1-federal, C2-vote-integrity) with SHA, command, exit code; unrun items stay `NOT_RUN` or `BLOCKED` with reason.
- [ ] **Step 2: Fix stale docs** — `.gsd/STATE.md` to the merged baseline (175 contracts, protected master, Dell runner `dell-utp-1`); `WORKSPACE-MAP.md` to say #20/#21 merged at `777658f`, via `project_read` then `project_write`.
- [ ] **Step 3: Final gate** — in the worktree `npm ci && npm run ci:fast && npm run build && git diff --check`; expected exit 0. Run `npm run test:db` where Docker exists.
- [ ] **Step 4: Prepare, do not execute, external steps** — write into the ledger: the branch push + PR command, `supabase db push --dry-run` output for the four migrations, and any Vercel change from Task 1. Stop for Sam's authorization on each.
- [ ] **Step 5: Brain handoff** — insert one `cowork_sessions` row (`task_tag: 'utp-first-cycle'`) with summary, ledger statuses and next actions; no secrets.
- [ ] **Step 6: Commit** `docs: update evidence ledger, state and workspace map`.

---

## Self-review

- **Spec coverage:** A (isolated reconcile, nonempty web tests, DB tests for RLS/duplicates/concurrency) → Tasks 0, 2-6. B (source status/failed queue, no sample-as-live, vote tests: double/concurrent/forged auth/RLS, aggregate recount) → Tasks 4, 7, 8. R2 → Task 1. I1 → Tasks 2, 3, 6. **Not covered here, by design:** C (Rootstock lifecycle, G1/G2), I2 (TOTP/phone/camera), citizen drafting (C2 beyond votes), nationwide ledger (C3), anchoring, L2/PQ/ZK. Each needs its own plan.
- **Type consistency:** `requireUser` return shape is the one consumed by Tasks 4, 5, 6; `SourceStatus` is reused by `DataStatusBadge`; `recordHash` named consistently in adapter, migration (`bill_versions.record_hash`), and tests.
- **Proportion:** logic bodies are specified by signature and tests; only the trigger-locking approach and `recordHash` definition are spelled out because the signatures don't determine them.

## Open decisions (block only dependent steps)

- **U1:** Does the Dell runner have Docker for `supabase start`? Until answered, `test:db` is a local gate and `NOT_RUN` in CI.
- **U2:** Local-government denominator (Legistar clients, municipalities/counties) — blocks the local slice only.
- **U3:** Which Supabase project (local-only vs a staging project) receives the four migrations first — blocks remote application only.
- **U4:** Whether Privy sign-in stays visible in `TopBar` during the transition, or is hidden until wallet linking ships.
