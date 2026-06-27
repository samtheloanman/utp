# UtP Technical Specification v3.0

Last reviewed: 2026-06-25 PT

## Architecture

UtP is a Next.js application backed by EVM-compatible DAO contracts and off-chain civic data services. The DAO is the protocol control plane; civic trust data provides governance context.

## Active Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS.
- **Identity/Wallet**: Privy, Wagmi, Viem, wallet SDK integrations.
- **Interaction/UI**: Three.js, React Three Fiber, GSAP, Lenis.
- **Contracts**: Solidity 0.8.x with Hardhat and OpenZeppelin.
- **Target Network**: Rootstock/RSK-compatible EVM configuration.
- **Data**: Supabase plus local civic/legislative datasets.
- **AI/Data APIs**: Aggregation, debate, legislature, and news routes.

## Application Surface

Current routes include:

- `/`
- `/issue/[id]`
- `/legislature`
- `/news`
- `/governance`
- `/events`
- `/vault`
- `/launch`
- `/stablecoin`
- `/token`
- `/us/california/[bill]`

Current APIs include:

- `/api/aggregate`
- `/api/debate`
- `/api/legislature`
- `/api/news`
- `/api/propose`
- `/api/vote`

## Protocol Surface

The contract suite currently covers:

- DAO execution and root permissions.
- Permission management.
- Plugin registration and removal.
- Treasury custody and withdrawals.
- Civic polling.
- Governance proposals and hybrid/ZK voting.
- Event markets.
- Stablecoin control and collateral/token contracts.
- Governance token behavior.
- Mock quantum and zero-knowledge verifiers.

## Verification Commands

```bash
npm run lint
npm run build
npm run compile
npx hardhat test
```

`npm test` currently invokes `scripts/verify.js`, which expects compiled artifacts and a configured local RPC environment. It should not be treated as the complete test suite until Phase 0 repairs it.

## Baseline Results

Validated on 2026-06-25:

- `npm run lint`: Passes with a Next.js deprecation notice for `next lint`.
- `npm run build`: Passes and generates 23 routes.
- `npm run compile`: Compiles 55 Solidity files successfully.
- `npx hardhat test`: 128 passing, 14 failing.

Current contract failures:

- Plugin uninstall permission/revoke flow.
- Hybrid vote authentication and quorum execution.
- Missing `MockPriceOracle` artifact/setup for stablecoin tests.

Current build warnings:

- Optional `@stripe/crypto` dependency through Privy.
- Optional `@farcaster/mini-app-solana` dependency through Privy.
- Dynamic dependency warnings in Viem/Ox Tempo modules.

## Data and Trust Requirements

- Preserve primary source URLs for civic records.
- Require citations for trusted AI summaries.
- Keep ingestion idempotent.
- Distinguish source facts from generated arguments.
- Avoid storing raw IP addresses or unnecessary high-risk user metadata.

## Security and Release Gates

- Permission and treasury failures block DAO launch.
- Governance authentication failures block binding on-chain voting.
- Stablecoin test failures block financial launch.
- Dependency audit findings require triage before production launch.
- Financial features require legal, sanctions, custody, and money-transmission review.
- Private keys must remain client-side.
