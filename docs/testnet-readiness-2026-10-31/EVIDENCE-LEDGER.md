# First-cycle evidence ledger

Plan: `docs/superpowers/plans/2026-11-03-utp-first-cycle-release-identity-civic.md`. Statuses: PASS / FAIL / NOT_RUN / BLOCKED / BLOCKED_ON_AUTH. Missing evidence is never PASS.

Environment: Claude cloud container (Linux, Node 22.23.4, npm 10.9.9, PostgreSQL 16 binaries, no Docker). Clone of `https://github.com/samtheloanman/utp` at `origin/master` `777658f`, branch `feat/first-cycle-auth-civic`. The canonical Mac checkout (`d81e60b`, dirty) was not modified; its uncommitted auth files and readiness docs were copied in read-only (provenance below).

| id | status | sha | command | exit | note |
|---|---|---|---|---|---|
| A-baseline-web | PASS | 777658f | `npm run lint && npm run typecheck && npm run test:web` (inside `npm run ci:fast`) | 0 | lint clean, typecheck clean, 2/2 web tests |
| A-baseline-contracts | PASS | 777658f | `SOLC_JS_PATH=<solc 0.8.24 soljson.js> npm run test:contracts` | 0 | 175 passing. Plain `ci:fast` fails here only because the sandbox cannot download solc (HH502 ENOTFOUND binaries.soliditylang.org) |
| A-zero-test-guard | PASS | 777658f | `npx vitest run src/__no_such_dir__` | 1 | Vitest exits non-zero when no test files are found |
| R2-vercel-production-target | BLOCKED | 777658f | Vercel MCP read tools (`get_project`, `list_deployments`, `list_project_domains`, `get_deployment`) | 403 | `forbidden` for scope `samtheloanmans-projects` (`team_D2rNpq3e1jGfA7HanfuwMX3O`); productionBranch and deployment targets NOT_DETERMINED. Needs Sam to authorize team access |

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
