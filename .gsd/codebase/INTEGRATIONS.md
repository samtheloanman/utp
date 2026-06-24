# External Integrations

This document tracks the external services, APIs, databases, and third-party integrations used within the `utp` codebase.

## Blockchain Networks
- **Target Network**: RSK (Rootstock) Testnet and Mainnet as the primary EVM-compatible networks, as configured in the Hardhat configuration files.
- **Provider Connection**: Local network `hardhat` nodes for testing, and public/custom RPC endpoints for interacting with RSK.

## Web3 & Wallet Providers
- **RainbowKit & Wagmi**: Facilitates seamless wallet connection logic and UI for the user. Supports a variety of Ethereum-based wallets seamlessly.
- **Coinbase Wallet SDK**: Configured as an optional wallet connection provider via `@coinbase/wallet-sdk`.
- **MetaMask SDK**: Supported standard browser wallet integration via `@metamask/sdk`.
- **WalletConnect**: For mobile wallets and QR-based authentication (`@walletconnect/ethereum-provider`).

## Authentication & Database
- **Supabase**: Backend-as-a-Service providing PostgreSQL database, real-time subscriptions, and scalable authentication. The integration leverages `@supabase/supabase-js`. Used for managing centralized application data alongside the decentralized contract state.

## Other Services
- **Ratelimit**: Used for limiting specific API requests or frontend actions (via `ratelimit` package).
- **Safe Apps**: Integrating with Gnosis Safe ecosystem via `@safe-global/safe-apps-sdk` and related `@safe-global` providers, likely for advanced DAO treasury management or transaction bundling. 
