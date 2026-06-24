# Testing Patterns

This document covers the structure and execution of tests for both the frontend application and smart contracts in `utp`.

## Smart Contract Testing
- **Framework**: Hardhat testing framework utilizing Mocha JS and Chai standard assertions (`@nomicfoundation/hardhat-chai-matchers`).
- **Structure**: Tests mirror the `contracts/` directory seamlessly within the `test/` folder.
  - `test/core/`: Validates core DAO registry and Treasury logic.
  - `test/plugins/`: Validates isolated plugin logic before it gets attached to a DAO implementation map.
  - `test/integration/`: High-level system tests verifying end-to-end DAO flows (plugin installation, proposal execution via Timelock).
- **Execution**: Can be run globally using `npx hardhat test` or `npm run test` which is aliased to scripts.

## Frontend UI Testing
- **Framework**: Vitest paired with React Testing Library.
- **Location**: Usually collocated locally next to components via `__tests__` directories (e.g. `src/components/__tests__`).
- **Scope**: Asserts UI behaviors, component rendering states based on simulated Web3 connections.
- **Coverage Strategy**: Testing concentrates on preventing regressions regarding layout breaking and React Hooks edge cases in `src/lib/hooks.ts`. Mocking providers for Web3 calls is used across tests instead of initiating live block interactions.
