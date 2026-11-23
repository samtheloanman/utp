# UTP — Agent Entry Point

Civic governance & transparency web platform with smart contracts and congressional data connectors. Stack: Next.js 15 (App Router in `src/app/`, React 19, TypeScript 5.9), Tailwind CSS, Supabase, Privy + Wagmi + Viem, Hardhat Solidity (`contracts/`, `solc 0.8.33`, OpenZeppelin v5), Vitest, ESLint 9, Python (`congress_connector/`, `scripts/`).

## Commands (Verified)

- Install: `npm ci`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Web unit tests: `npm run test:web` (`vitest run`)
- Contract compile (+ ABI codegen): `npm run compile`
- Contract tests: `npm run test:contracts` (`hardhat test`)
- Standards gate: `npm run check:standards`
- Fast verify (run before every commit): `npm run ci:fast`
- Python lint (changed files): `ruff check congress_connector/ scripts/`
- Enable diff-scoped pre-commit hook: `git config core.hooksPath .githooks`

## Architecture Map (Progressive Disclosure)

- Coding standards & boundaries: `docs/CODING_STANDARDS.md` **(read before writing code)**
- Knowledge graph: `graphify-out/GRAPH_REPORT.md` (or `graphify-out/wiki/index.md` if present); after code edits rebuild via `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`
- Product, threat model & brand: `brain/prd.md`, `THREAT_MODEL.md`, `DESIGN.md`
- Superpowers specs & plans: `docs/superpowers/` (never create new `.gsd/` phase trees)

## Non-Negotiable Invariants

- **Brand System:** Follow `DESIGN.md` (civic glass-teal tokens in `src/app/globals.css`). Never reintroduce the archived dark "uBTC" theme or `/launch` and `/vault` routes.
- **Smart Contract & ABI Sync:** Compile contracts with `npm run compile` (triggers `postcompile` ABI generation via `scripts/generate-abis.js`). Never hand-edit generated ABIs; run `npm run test:contracts` on any contract change.
- **Security & Threat Model:** Respect `THREAT_MODEL.md`; never expose server secrets via `NEXT_PUBLIC_` or commit private keys / `.env` values.
- **Workspace Strictness:** Operate strictly inside this repo/worktree root; ignore IDE active-document metadata from other projects.
- **Dependencies:** Never add packages outside `package-lock.json` without approval.
- **Git & Merge:** Work in a dedicated `git worktree` on `<agent>/<ISSUE-KEY>-slug`. Never push directly to `master` or merge PRs directly.

## Legacy Gotchas (Do Not Copy)

- `archive/` & `archive/design-dark-v1/`: archived reference only (excluded from TS, ESLint, and build); never import from or copy patterns from it.
- `.gsd/`: legacy GSD state/roadmap (read-only); new specs/plans belong in `docs/superpowers/`.

## Definition of Done

1. Run `npm run ci:fast` — 0 errors, 0 skipped/weakened tests.
2. Run `clean-code-guard` on changed production code and `test-guard` on changed tests.
3. No unused imports, `any` escapes, empty `catch` blocks, hardcoded secrets, or `"ok"` stubs.
