# Repository Structure

This document outlines the file layout and explicit naming conventions of the `utp` codebase.

## Directory Layout

### `src/` - Frontend Application
Contains all React and Next.js UI logic:
- `src/app/`: Next.js App Router pages (e.g., `events`, `governance`, `token`, `legislature`). Subdirectories define URL routes.
- `src/components/`: Reusable React components (`ProposalList.tsx`, `ShadowVote.tsx`). Contains its own `__tests__` subdirectory for localized testing.
- `src/lib/`: Shared utility functions, typed ABIs, Web3 configurations (`wagmi.ts`, `contracts.ts`), and Supabase connection objects (`supabase.ts`).

### `contracts/` - Smart Contracts
Solidity contracts organized by domain:
- `core/`: Fundamental DAO contracts (`DAO.sol`, `Treasury.sol`, `PluginRegistry.sol`).
- `plugins/`: Extensible functionality modules mapped into the DAO.
- `tokens/`: Implementation of `UTP` and `UBTC`.
- `access/`: OpenZeppelin inherited access and timelock controllers.
- `test/`: Test helper mocked contracts.

### `test/` - Smart Contract Testing
Hardhat/Mocha test suites mimicking the contract hierarchy for isolated testing:
- `core/`, `plugins/`, `integration/`, `crypto/`, `tokens/`.
- Validates the Solidity behavior before deployment.

### `scripts/` - Ops & Deployment
Contains build utilities and deployment pipelines:
- `deploy.cjs`: Main hardhat deployment script for pushing contracts to RSK or local nodes.
- `verify.js`: Etherscan/Blockscout verification helper.
- `generate-abis.js`: Script to generate JSON ABIs post-compilation to be used by the frontend.

## Naming Conventions
- **React Components**: `PascalCase.tsx`.
- **Utility Files**: `kebab-case.ts` or `camelCase.ts`.
- **Smart Contracts**: `PascalCase.sol` matching the contained contract name directly.
- **Tests**: `PascalCase.test.js` indicating the contract or component under test.
