# GSD Roadmap

Last reviewed: 2026-06-25 PT

## Phase 0: Platform Stabilization

- Fix PluginRegistry uninstall permission failures.
- Fix hybrid governance authentication failures.
- Restore stablecoin oracle test setup.
- Repair `npm test`.
- Migrate away from deprecated `next lint`.
- Triage dependency and build warnings.

Verification:

- App lint/build pass.
- Contracts compile.
- The contract test suite is green, or documented exceptions are explicitly approved.

## Phase 1: Civic Trust Evidence

- Source registry and ingestion hardening.
- Citation-required summaries and debate output.
- Clear separation of facts, analysis, and sentiment.
- Civic records linked to governance context.

## Phase 2: DAO Governance

- Permission and plugin safety.
- Proposal, voting, quorum, and execution reliability.
- Clear shadow, signed, and on-chain vote semantics.
- Testnet governance flow.

## Phase 3: Financial Modules

- Stablecoin, vault, token, and event-market validation.
- Treasury and collateral threat models.
- Compliance and legal launch gates.
- Explicit gated UI states.

## Phase 4: Launch Operations

- CI, accessibility, performance, monitoring, rollback, and testnet Alpha.
