# UTP Coding Standards

> Enforced mechanically by `tsc --noEmit`, `eslint` (diff-scoped strict rules on staged files), `ruff` (`ruff.toml` for Python), `vitest run`, `hardhat test`, and `scripts/check-coding-standards-caps.sh` on changed/new files (legacy code untouched). Global clean-code & test-quality rules live in `clean-code-guard` and `test-guard` — do not duplicate them here.

## 1. Layering & Module Boundaries

Dependencies flow strictly one way:
`contracts/ (Solidity + generated ABIs) & src/data/ -> src/lib/ (Supabase, wagmi/viem, domain services) -> src/app/api/ -> src/components/ & src/app/`

- Client components (`'use client'`) never import server-only Supabase service keys or privileged credentials.
- Never import anything from `archive/` (excluded from TypeScript, ESLint, and Next.js build).
- Python data ingestion (`congress_connector/`, `scripts/`) stays decoupled from Next.js runtime code and writes through documented schemas/APIs.

## 2. Trust Boundaries & Security

- **Validate at the edge:** Every `src/app/api/**/route.ts` input (body, query, params), webhook, and external civic API payload must be validated before domain or DB logic runs.
- **Trust inside the boundary:** Avoid redundant runtime checks on already-validated internal domain types.
- **Database & Smart Contracts:** Parameterized Supabase queries only; follow OpenZeppelin v5 patterns and `THREAT_MODEL.md` invariants in `contracts/`.
- **Secrets:** Never prefix server secrets or RPC private keys with `NEXT_PUBLIC_`; load via env/Secret Manager only.

## 3. TypeScript & Python Strictness (Diff-Scoped Hard Gate)

All new and modified `.ts`/`.tsx`/`.js`/`.mjs` and `.py` files MUST pass `.githooks/pre-commit` (`scripts/pre-commit-diff-guard.sh`):

- `tsc --noEmit` (`npm run typecheck`) with 0 errors.
- `@typescript-eslint/no-explicit-any`: **error** — use `unknown` + type guards instead of `any`.
- `@typescript-eslint/no-unused-vars`: **error** (prefix intentional ignores with `_`).
- `no-empty`: **error** (`allowEmptyCatch: false`) — never write empty `catch {}` blocks.
- Python (`congress_connector/`, `scripts/`): must pass `ruff check` (`ruff.toml`: `E`, `F`, `W`, `I`, `B`, `SIM`, `S`, `UP`, `C90` max complexity `<= 10`).
- New functions target `<= 80` lines and cyclomatic complexity `<= 10`.

## 4. Canonical UTP Idioms (One Way Only)

| Concern | Canonical Tool / Helper | Forbidden Alternatives |
|---|---|---|
| Styling & Brand | `DESIGN.md` civic glass-teal tokens (`src/app/globals.css`) | archived dark "uBTC" theme (`archive/design-dark-v1/`) |
| Wallet / Web3 | Privy + Wagmi + Viem + generated ABIs (`npm run compile`) | hand-edited ABI JSON or raw untyped RPC calls |
| Database | Typed `@supabase/supabase-js` client in `src/lib/` | string-concatenated SQL or client-side service role keys |
| HTTP calls | `fetch` with explicit timeout (`AbortSignal.timeout`) + `res.ok` check | unbounded `fetch` ignoring non-2xx responses |
| Smart Contracts | Solidity `0.8.24` + OpenZeppelin v5 + Hardhat tests | deploying untested contract edits or skipping ABI sync |

## 5. Testing & Verification Standards

- **Red -> Green TDD:** For bug fixes and new behavior, write a failing Vitest (`npm run test:web`) or Hardhat (`npm run test:contracts`) test first, confirm it fails, then implement until green.
- **Boundary cases:** Test `0`, `1`, `null`/`undefined`, empty results, unauthorized/invalid wallet signatures, and revert conditions in Solidity tests.
- **UI proof:** Web UI changes require live Playwright/browser verification before claiming done.

## 6. Forbidden AI Failure Modes (Hard Reject in Review)

- **Silent assumptions:** State ambiguous assumptions and tradeoffs before coding.
- **Drive-by refactoring (Surgical Changes Only):** Touch only lines required for the task; never reformat or rewrite unrelated legacy code.
- **Hallucinated APIs:** Verify every imported symbol against `package.json` / `package-lock.json` and `congress_connector/requirements.txt` / `scripts/requirements.txt`.
- **Speculative abstractions:** No unused flags, factories, or `_v2` toggles without a current caller.
- **Silent fallbacks:** Never swallow exceptions or return hardcoded `{ ok: true }` stubs on failure.

## 7. Mechanical Enforcement & Compounding Loop

- Enforced by: `.githooks/pre-commit` (`scripts/pre-commit-diff-guard.sh`), `scripts/check-coding-standards-caps.sh`, `eslint.config.mjs`, `ruff.toml`, `tsc --noEmit`, `vitest`, `hardhat test`, `gitleaks`.
- **Hard doc caps:** `AGENTS.md <= 100` lines; `docs/CODING_STANDARDS.md <= 150` lines.
- **Compounding rule:** Every repeatable AI review bug becomes an ESLint/Ruff rule or Vitest/Hardhat regression test in the same PR. Add prose here only if unlintable, and prune before hitting 150 lines.
