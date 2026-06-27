# UtP GSD Roadmap - Freedom Stack Civic DAO

Last reviewed: 2026-06-25 PT

## Active Scope

The DAO is the foundation of UtP. Civic trust remains the evidence and legitimacy layer for governance. Financial modules are active protocol work but remain gated until technical, legal, and safety requirements pass.

## GSD Loop

1. Check the branch and working tree.
2. Select one task from the active phase.
3. Implement the smallest complete change.
4. Add or update tests.
5. Run the phase verification gate.
6. Update `.gsd/STATE.md` and this roadmap.
7. Commit and push the intentional diff.
8. Repeat.

## Current Baseline

- Default GitHub branch: `master`.
- App build: Passing.
- Lint: Passing.
- Contract compile: Passing.
- Contract tests: 128 passing, 14 failing.
- Dependency audit: 83 findings after a clean install.
- Current reconciliation branch: `sync/freedom-stack-master`.

## Phase 0: Stabilize the Existing Platform

Goal: Establish a trustworthy green baseline without redesigning the product.

- [ ] Fix PluginRegistry uninstall permission failures.
- [ ] Fix hybrid vote authentication and quorum test failures.
- [ ] Restore or replace `MockPriceOracle` for stablecoin tests.
- [ ] Make `npm test` run the intended automated suites.
- [ ] Migrate `next lint` to the ESLint CLI.
- [ ] Triage dependency audit findings without blind force upgrades.
- [ ] Resolve optional Privy/Viem build warnings where practical.
- [ ] Confirm environment-variable requirements for wallet, Supabase, and contracts.

Exit gate:

- `npm run lint` passes.
- `npm run build` passes.
- `npm run compile` passes.
- Contract tests pass, or intentionally quarantined tests have documented owners and rationale.
- The working tree is clean.

## Phase 1: Civic Trust Evidence Layer

Goal: Make every governance issue traceable to reliable evidence.

- [ ] Define source registry and trust metadata.
- [ ] Harden legislative/news ingestion for idempotency.
- [ ] Require citations in generated summaries and debate arguments.
- [ ] Label facts, generated analysis, and community sentiment separately.
- [ ] Add source-quality and uncited-output tests.
- [ ] Link issue records to proposal/vote context.

Exit gate:

- Every trusted issue has attributable sources.
- Uncited AI output fails safely.
- Re-running ingestion creates no duplicate source records.

## Phase 2: DAO Governance Foundation

Goal: Make governance permissions, voting, and execution reliable.

- [ ] Close all Phase 0 permission and authentication failures.
- [ ] Define off-chain, wallet-signed, and on-chain voting semantics.
- [ ] Test proposal creation, quorum, execution, and double-vote prevention.
- [ ] Test plugin installation/removal and treasury authorization.
- [ ] Expose governance status clearly in the UI.
- [ ] Add testnet deployment and rollback procedures.

Exit gate:

- Permission, plugin, treasury, and governance suites pass.
- Binding actions cannot be confused with sentiment polls.
- The testnet governance flow works end to end.

## Phase 3: Financial Protocol Modules

Goal: Integrate stablecoin, vault, token, and market features under DAO control.

- [ ] Complete stablecoin oracle/collateral test coverage.
- [ ] Complete vault and treasury threat models.
- [ ] Test mint, burn, pause, limits, and emergency controls.
- [ ] Verify token voting power and delegation behavior.
- [ ] Add explicit gated/unavailable UI states.
- [ ] Complete legal and compliance review before public enablement.

Exit gate:

- Financial contract suites pass.
- Threat model and audit findings are resolved or formally accepted.
- Public UI only exposes approved and configured functionality.

## Phase 4: Launch and Operations

Goal: Ship a monitored, reversible public release.

- [ ] Add CI for lint, build, compile, contract tests, and application tests.
- [ ] Add accessibility and performance gates.
- [ ] Add API rate limits, logging, and incident alerts.
- [ ] Document deployment, rollback, and contract upgrade procedures.
- [ ] Run a controlled testnet Alpha.
- [ ] Complete the production launch review.

Exit gate:

- CI is green.
- Deployment and rollback are rehearsed.
- No unresolved launch-blocking security or compliance findings remain.
