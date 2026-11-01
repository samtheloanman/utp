# Coding Conventions

This document captures the agreed-upon standards, code style, and patterns across various languages in the `utp` repository.

## Solidity Standards (Smart Contracts)
- **Tooling**: Built utilizing Hardhat, with a focus on EVM version configuration optimized for the RSK network.
- **Pragmas**: Pinned to floating near `^0.8.24` consistently across all `.sol` files.
- **Inheritance**: Leverages OpenZeppelin `v5.x` extensively for standard behavior (e.g., token standards, role-based access control).
- **Architecture rules**:
  1. Plugins must be stateless or isolated in logic, registering functionality through the `PluginRegistry`.
  2. Funds must cleanly route through `Treasury.sol`, adhering strictly to `PermissionManager` limits.
- **Error Handling**: Custom Solidity `error` declarations are preferred over string `require()` statements to save gas.

## Frontend Standards (Next.js & React)
- **Components**: Functional components only, utilizing React Hooks. 
- **Styling**: Tailwind CSS classes defined inline or composed thoughtfully. No generic SCSS unless required outside of Tailwind limits.
- **State Flow**: Decentralize reading state by preferring localized `wagmi` hooks to read contract values directly rather than hoisting state up unnecessarily. Global state should rest in `zustand`.
- **Routing**: Next.js App Router rules apply. Server components by default (no `'use client'`), adding `'use client'` strictly at the interaction boundaries.
- **Imports**: Avoid deep relative imports (`../../../`) by aliasing root paths where applicable.

## Scripts & Tooling
- ESLint and Prettier are installed and utilized to enforce JavaScript and TypeScript syntax uniformity.
- Node scripts typically written in ES Modules where applicable, except `hardhat.config.cjs` due to hardhat CommonJS preferences.
