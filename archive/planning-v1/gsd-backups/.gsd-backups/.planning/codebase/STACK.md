# Tech Stack

This document details the core technologies, languages, frameworks, and configuration files used in the `utp` projects.

## Languages
- **TypeScript**: Used extensively across the frontend and scripting layers. Ensures type safety for React components and Node.js utility scripts.
- **Solidity (^0.8.24)**: The smart contract language used for the DAO, token, and plugin logic.

## Runtime & Package Management
- **Node.js**: Execution environment for scripts, Next.js building, and Hardhat tasks.
- **NPM**: Handles dependency management and scripts.

## Frameworks & Libraries
### Frontend
- **Next.js 15 (App Router)**: Core application framework handling routing, static/dynamic rendering (`src/app/`).
- **React 19**: Component library for building the UI presentation layer.
- **Tailwind CSS 4**: Utility-first CSS framework (configured through `@tailwindcss/postcss`).
- **Zustand**: Lightweight state management for frontend application state.

### Web3 & Blockchain
- **Viem & Wagmi (v3)**: Ethereum interaction primitives and React hooks for interfacing with blockchain networks and managing provider connections.
- **RainbowKit**: Provides the wallet connection modal and connection management UI.
- **Hardhat**: Ethereum development environment used for compiling, testing, and deploying the smart contracts. Includes ethers and chai plugins.
- **OpenZeppelin Contracts**: Standard implementations of tokens (ERC20) and access control.

## Testing
- **Vitest**: Used as the frontend unit testing framework, integrated with React Testing Library.
- **Hardhat/Mocha/Chai**: Used for writing tests against the Solidity smart contracts (found in `test/`).

## Configuration Files
- `hardhat.config.cjs`: Specifies Solidity compiler settings (viaIR: true), network configurations (rskTestnet, rskMainnet, hardhat), and gas reporting.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: TypeScript compiler options for the project.
- `tailwind.config.ts` / `postcss.config.mjs`: Styling build tools configuration.
