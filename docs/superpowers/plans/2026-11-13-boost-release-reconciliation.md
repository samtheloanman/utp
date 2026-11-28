# UTP branch promotion and provider provisioning

Date: 2026-11-13 America/Los_Angeles. Invoked workflow: boost.

## Authorized objective

Validate and stage `feat/superpowers-civic-auth` at `28c73e8`, promote to GitHub only after Forgejo CI and Hermes review, create or update the appropriate PR, provision dedicated Supabase `utp` and apply verified migrations, deploy Rootstock chain 31 only with funded test identities, and store a consolidated Brain handoff. No production app deployment or merge is included in this batch.

## Observed baseline

- Local branch at `28c73e8`; GitHub feature branch at `e8b86e2`, master at `777658f`.
- `e8b86e2..28c73e8` includes 24 reachable commits, including merged branch histories.
- PR #22 is open on `feat/first-cycle-auth-civic` at `23f70bf7`; a new PR is preferred for the consolidated branch after staging. Keep #22 until supersession is verified.
- Forgejo `forgejo-admin/utp` is a pull mirror at `e8b86e2`; pull-request/action API requests returned 404. Existing remote authenticates as admin; no registered Codex token was found. Do not bypass required bot identity, Forgejo CI or Hermes review.
- Existing Brain handoff is not the latest: November 3 research summary `2d2524fe-af65-4aa4-9cea-c405de046756` exists.
- No UTP project existed in Supabase organization `ywdpwnblbkfaefovqkkk`; authorized creation produced `tuajgdhslxqmiaehsend` in `us-west-1`, initially ACTIVE_HEALTHY. Password held in Keychain `utp-supabase-db-password` only.
- Rootstock deployment environment fields absent; no matching deployer secret located in checked Keychain/GCP references. Do not invent participant addresses or substitute Hardhat keys.

## Acceptance and evidence

| Criterion | Command / observation | Status |
|---|---|---|
| A1 local integrated checks | `npm run ci:fast` | PASS: lint/typecheck, 127 web tests, 181 contracts; `/tmp/utp-boost-ci-20261113.log` |
| A2 DB migration rehearsal | `npm run test:db` | PASS: 31 tests; disposable PostgreSQL auth shim, not live Supabase verification; `/tmp/utp-boost-db-20261113.log` |
| A3 production build | `npm run build` | PASS; `/tmp/utp-boost-build-20261113.log` |
| A4 Forgejo promotion gate | Writable staging + bot identity + CI + Hermes review on exact head | BLOCKED pending infrastructure decision |
| A5 GitHub push and PR | Remote SHA equals candidate after A4 | NOT_RUN |
| A6 Supabase provisioning | Dedicated project and migration history/schema read-back | PASS: eight migrations applied; live read-back confirms all eight versions, 23 public tables with RLS enabled, chain rows 31/31337 and enabled ensure_rls trigger. See `2026-11-13-utp-supabase-readback.json`. |
| A7 Rootstock deployment | Chain 31, funded deployer, distinct participant addresses, receipts/invariants | BLOCKED missing credentials/roles |
| A8 Brain handoff | Distilled evidence and blockers | Consolidated partial handoff to be stored; explicitly not a push-completion receipt |

## Adversarial checks and execution boundaries

A successful local test does not satisfy remote CI/Hermes review. A pull mirror must not be treated as a writable staging repository. No force push or duplicate upstream push through both `origin` and `github` (they name the same GitHub repository). New Supabase migrations target only the dedicated empty UTP project; never CMRE/CGC/IAN. A newly created empty DB can be retained if provisioning/migrations fail; no automatic project deletion. No application environment change until separately scoped. Four public addresses do not demonstrate four independent operators; complete testnet governance still needs participant signing and real wait periods.

Max two repair attempts per failing criterion under boost; never weaken a gate. Preserve dirty submodules and local agent-runtime files. Embedded Forgejo remote credential was exposed by a diagnostic; rotation is required, but shared credential rotation is not performed without identifying consumers and authorization.

## Verification boundary

Supabase provisioning/schema is complete. No application env vars were wired and no OAuth/browser end-to-end flow was tested against the new project. Rootstock RPC returned chain ID `0x1f`; no transaction was broadcast. GitHub and Forgejo feature heads remain `e8b86e2`, and PR #22 remains unchanged. Infrastructure clarification and testnet identity references were requested.
