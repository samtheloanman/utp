# First-cycle evidence ledger

Plan: `docs/superpowers/plans/2026-11-03-utp-first-cycle-release-identity-civic.md`. Statuses: PASS / FAIL / NOT_RUN / BLOCKED / BLOCKED_ON_AUTH. Missing evidence is never PASS.

Environment: Claude cloud container (Linux, Node 22.23.4, npm 10.9.9, PostgreSQL 16 binaries, no Docker). Clone of `https://github.com/samtheloanman/utp` at `origin/master` `777658f`, branch `feat/first-cycle-auth-civic`. The canonical Mac checkout (`d81e60b`, dirty) was not modified; its uncommitted auth files and readiness docs were copied in read-only (provenance below).

| id | status | sha | command | exit | note |
|---|---|---|---|---|---|
| A-baseline-web | PASS | 777658f | `npm run lint && npm run typecheck && npm run test:web` (inside `npm run ci:fast`) | 0 | lint clean, typecheck clean, 2/2 web tests |
| A-baseline-contracts | PASS | 777658f | `SOLC_JS_PATH=<solc 0.8.24 soljson.js> npm run test:contracts` | 0 | 175 passing. Plain `ci:fast` fails here only because the sandbox cannot download solc (HH502 ENOTFOUND binaries.soliditylang.org) |
| A-zero-test-guard | PASS | 777658f | `npx vitest run src/__no_such_dir__` | 1 | Vitest exits non-zero when no test files are found |

## Provenance of imported files (from the Mac checkout, 2026-11-03)

Readiness docs `docs/testnet-readiness-2026-10-31/*.md` and `EVIDENCE.json`, and the plan file, were untracked on the Mac and are committed here unchanged. Auth files are imported in Task 2 and listed there with `git hash-object` values.
