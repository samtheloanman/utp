# Codex → Claude: UTP ownership handoff (2026-11-17)

Claude owns the next UTP implementation slice. Canonical checkout: `/Users/maysamtehranchi/Code/utp`; shared branch `feat/superpowers-civic-auth` remains at `28c73e8` with dirty, unrelated submodule directories and untracked plans. Work in a new worktree under a claimed Paperclip UTP issue; do not switch or clean the shared checkout. The PRD and execution plan dated 2026-11-17 are uncommitted drafts.

## Verified correction to W0

- Private writable Forgejo staging repo: `codex-utp/utp-staging`, PR #1. Claude's existing Forgejo account now has **read** access (API readback confirmed).
- Run 2 at `2b94793` failed in `actions/checkout` with `fatal: No url found for submodule path 'temp_ethdilithium' in .gitmodules`. The runner label, GitHub action reachability, and architecture were **not** the cause.
- Codex removed two orphaned gitlinks in an isolated worktree. Forgejo PR #1 head is **`785b0231372387ff8aca4e2d75455c88f2d3a1f5`**; the actual commit status `UTP staging / verify (push)` is **success**. Do not redo the run-2 fix. Full tests at this new head have a green staging receipt, but verify the job details before promotion.
- Forgejo PR #1 has **zero reviews**. The protected-branch rule was configured with contexts `verify` and `hermes/review`, while the actual runner context is `UTP staging / verify (push)`. Reconcile the rule with the real context; do not synthesize a status or review. Obtain an actual Hermes review on the head.
- GitHub `feat/superpowers-civic-auth` still needs promotion; old GitHub PR #22 is on `feat/first-cycle-auth-civic` at `23f70bf`. Compare coverage before closing #22. The user's earlier chat authorized staging repair, Forgejo/GitHub branch promotion and PR creation; current fleet rule reserves merge for automerge bot or Sam.

## Plan review before implementation

1. **Scope:** Sam explicitly chose nationwide local, state, and federal coverage earlier. The PRD's California-first alpha can be a rollout slice, but say how nationwide jurisdictions get explicit `none/partial/live` status and expansion, and do not silently redefine the product scope. The PRD itself currently says both nationwide state ingestion and “States other than CA” out of scope; resolve this contradiction.
2. **Three-wallet success metric:** W4 allocates tokens to only Voter A and B, while W5 requires at least three wallets voting. Specify a third funded, delegated voting wallet and its source of UTP before testnet acceptance. Confirm proposal threshold, quorum and snapshot voting power against the exact contracts.
3. **Custody:** Four addresses held by fleet agents do not establish independent custody if one operator or GCP principal controls all secrets. Record role owners, access and recovery. Do not claim hardware custody or post-quantum security from software EOAs. The council favored an authoritative role map and proof of signer control before generating replacement keys.
4. **W0 hygiene:** Removing tracked `UTP.zip`, `design.tar.gz` and PDF is separate cleanup. Check provenance and references before removing; it need not block CI promotion. The two orphaned gitlinks are already removed on the staging head.
5. **CI:** Forgejo uses Sammy Mac Pro, GitHub uses Dell. Bind branch protection to actual check names and inspect the final state on the exact head. No hosted runner fallback.
6. **Testnet outcome:** Validate the Guardian cancellation path against the deployed GovernancePlugin/Timelock roles and script behavior. Keep transaction hashes and constructor parameters in the release receipt.

## Current external state

Dedicated Supabase project `tuajgdhslxqmiaehsend` exists with eight applied migrations and 23 RLS-enabled public tables. Live OAuth/user flow is not yet accepted. Rootstock chain 31 has no broadcast receipt. Previous local `28c73e8` validation passed 127 web, 181 contract and 31 DB tests plus build. These are historical, so recheck after any new commit.

## Recommended first action

Claim W0 in Paperclip, inspect Forgejo PR #1 head and green job, fix the protection context, then arrange a real Hermes review. Read-only W2 census research may run concurrently in its own task/worktree. Coordinate one writer per file and do not ask Sam for the run-2 log: the cause and fix are documented above.
