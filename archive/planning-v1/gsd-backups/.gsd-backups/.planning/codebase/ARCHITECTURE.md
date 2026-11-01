# Architecture

This document describes the overarching software architecture, component boundaries, and data flow of the `utp` application.

## High-Level Pattern
The project implements a **Decentralized Application (dApp) architecture** using a robust separation of concerns:
1. **Presentation Layer**: Next.js App Router providing server-side and client-side rendering.
2. **Blockchain Layer (Smart Contracts)**: A modular DAO structure built with Solidity on RSK, using OpenZeppelin standards.
3. **Backend-as-a-Service Layer**: Supabase handles centralized indexing, off-chain data, or user profiles.

## Component Boundaries

### 1. Smart Contract Architecture
The Smart Contracts follow a modular "Plugin" approach:
- **Core modules**: `DAO.sol`, `PluginRegistry.sol`, `Treasury.sol`, `PermissionManager.sol`. These govern the central nervous system of the organization.
- **Plugin modules**: Extend the DAO capabilities dynamically without upgrading core logic. Notable plugins include `EventMarket.sol`, `GovernancePlugin.sol`, and `StablecoinController.sol`.
- **Access Control**: Powered by Timelock controllers and Permission Managers for strict function routing based on roles.
- **Tokens**: `UTPToken.sol` (Governance) and `UBTC.sol` (Wrapped Bitcoin/Stable asset logic).

### 2. Frontend Application
Built with **Next.js 15**, the UI is organized by feature domains:
- **Routing**: `src/app/` holds domain-specific dashboards such as `/token`, `/events`, `/legislature`, `/bill`, and `/governance`.
- **Components**: Separated into generic layouts and domain components (`ShadowVote.tsx`, `ProposalList.tsx`, `Sidebar.tsx`).
- **State**: Handled via `Zustand` locally, and `@tanstack/react-query` via `Wagmi` for remote blockchain data mapping.

## Data Flow
The key flow revolves around a hybrid on/off-chain model:
1. **Read Path**: The frontend queries the RSK blockchain directly using Viem/Wagmi via Public RPCs. Supabase may index complex data queries or store user sessions.
2. **Write Path**: Users initiate smart contract interactions via their injected Web3 wallet (e.g., MetaMask). Transactions are signed on the client and submitted to the RSK network.
3. **Event Propagation**: Components track transaction hashes and block confirmations via Wagmi hooks to provide real-time UI updates to users.
