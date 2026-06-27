# UtP Product Requirements Document v3.0

Last reviewed: 2026-06-25 PT

## Product Direction

UtP is a **DAO-first civic trust and financial coordination platform**. The DAO is the foundation for permissions, proposals, voting, treasury control, and future protocol modules. Civic trust is the evidence layer that gives those governance actions credible, source-backed context.

The active product is a hybrid:

1. **Civic Trust**: Citation-grounded issue context, legislative records, news, and public evidence.
2. **DAO Governance**: Wallet-linked proposals, voting, permissions, plugins, and treasury execution.
3. **Financial Protocol**: Stablecoin, vault, token, and market modules governed by the DAO and released only through explicit safety and compliance gates.

## Current Product Baseline

The default GitHub branch currently includes:

- A Next.js issue feed with local-to-global civic topics.
- Privy authentication and Wagmi/Viem wallet integration.
- On-chain polling integration.
- Issue, legislature, news, governance, events, vault, launch, stablecoin, and token routes.
- API routes for aggregation, debate, legislature, news, proposals, and votes.
- DAO, permission, plugin, treasury, polling, governance, event market, token, and stablecoin contracts.
- Supabase and off-chain data infrastructure.

## Target Users

- Civic participants who want source-backed context before voting.
- DAO members and contributors managing proposals and treasury decisions.
- Diaspora and regional communities coordinating around high-impact issues.
- Trusted Alpha users validating wallet, governance, and protocol flows.

## V1 Requirements

### Civic Trust Layer

- Every trusted summary must link to primary or clearly attributed sources.
- Uncited AI output must fail safely or be labeled unverified.
- Issue pages must distinguish evidence, interpretation, and community sentiment.
- Ingestion and aggregation jobs must be idempotent.

### DAO Foundation

- Contract permissions and treasury actions must fail closed.
- Plugin installation and removal must preserve authorization boundaries.
- Voting modes must be clearly labeled:
  - off-chain sentiment,
  - wallet-signed participation,
  - binding on-chain governance.
- Governance context must link back to civic evidence.

### Financial Layer

- Stablecoin, vault, token, staking, and market features are active protocol work.
- Public launch requires contract tests, threat modeling, legal review, and clear user disclosures.
- No interface may imply a financial feature is live when it is unconfigured, unaudited, or legally gated.
- User keys must remain client-side.

## Success Criteria

- The production build completes and core pages render.
- Civic issues expose source-backed context.
- Wallet authentication and voting degrade safely when configuration is missing.
- Contract compilation succeeds.
- Permission, governance, treasury, plugin, and stablecoin tests pass before those modules are considered launch-ready.
- Public copy distinguishes live functionality from roadmap or gated functionality.

## Current Launch Blockers

- Fourteen Hardhat tests currently fail across plugin uninstall permissions, hybrid vote authentication, and stablecoin test setup.
- `npm test` is not yet a reliable all-project test command.
- The dependency audit reports unresolved vulnerabilities.
- Build completes with optional Privy and Viem dependency warnings.
- Financial modules still require explicit compliance and safety review.
