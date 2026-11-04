# Project State

Last updated: 2026-11-03

## References
- Roadmap: `.gsd/ROADMAP.md` (only live roadmap)
- Product: `brain/prd.md`, `brain/02_TECHNICAL_SPEC.md`
- Plan: `docs/superpowers/plans/2026-11-03-utp-first-cycle-release-identity-civic.md`
- Evidence: `docs/testnet-readiness-2026-10-31/EVIDENCE-LEDGER.md` (statuses live there; missing evidence is never PASS)
- Brand: `DESIGN.md`.

## Baseline
`master` is protected. PRs #20 and #21 are merged at `777658f` (175 contract tests). CI runs only on the self-hosted Dell runner `dell-utp-1`. R2 (Vercel production target) is BLOCKED_ON_AUTH.

## Branch `feat/first-cycle-auth-civic` (NOT pushed, NOT merged; awaiting Sam's authorization)
Head `03cee70` on top of `777658f`:
- Supabase session/OAuth auth with same-origin redirect guard; `requireUser` (cookie and Bearer).
- Source adapter model with federal (Congress.gov) slice and OpenStates adapter; no fixture is ever marked live; sample content is labelled "Sample data".
- Authenticated `/api/vote` with DB-enforced one vote per user per bill and recounted aggregates; authenticated bounded `/api/propose`.
- Server-verified wallet linking (SIWE plus HMAC attestation checked in a SECURITY DEFINER RPC).
- Four migrations: `20261104000000_vote_integrity`, `0100_wallet_links`, `0200_source_registry`, `0300_voting_proposals`.

Final gate at head `03cee70`: lint, typecheck, vitest (107), build, `test:db` (27, shim PostgreSQL 16, not real Supabase), contracts (175, via SOLC_JS_PATH) and `git diff --check` all exit 0. Not verified: Dell CI on this head, real Supabase, live providers.

## Next actions
1. Prepared external steps in the ledger, each needs Sam's authorization: push and PR; `supabase db push --dry-run` then apply the four migrations (with the preflights); secrets (`WALLET_LINK_SECRET`, `CONGRESS_API_KEY`, OpenStates key, `IP_SALT`); Vercel team access for R2.
2. Open decisions: U1 Docker on the Dell runner (until then `test:db` is a local gate); U2 local-government denominator (blocks C1 local); U3 target Supabase project for the migrations; U4 Privy sign-in visibility in `TopBar`.
3. Deferred: TOTP/phone/camera proofing (I2); ERC-1271 contract-wallet signatures; G1/G2 Rootstock governance lifecycle; RSK testnet deploy (owner creates the `rsk-testnet` environment secret).
