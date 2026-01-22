# Project Context: Bitcoin DAO Framework (UTP)

## Technology Stack
- **Blockchain**: Bitcoin L2 (Rootstock / EVM-compatible).
- **Execution Layer**: Ethereum Virtual Machine (EVM).
- **Languages**: Solidity (Smart Contracts), TypeScript (Tooling/Tests).
- **Frameworks**: Foundry (Testing), Hardhat (Deployment).
- **Cryptography**: 
    - ECC (secp256k1).
    - Post-Quantum (Dilithium/SPHINCS+ mock).
    - ZK (Semaphore/MACI conceptually).

## Architecture Overview
- **Kernel**: `DAO.sol`, `PermissionManager.sol`, `PluginRegistry.sol`.
- **Authorization**: `HybridSigner`, `ZKVerifier`.
- **Plugins**: Governance, Treasury, Stablecoin Controller.

## External Dependencies
- **Aragon OSx**: Conceptual model for plugin architecture.
- **Safe**: Reference for treasury management.
- **Rootstock (RSK)**: Primary L2 target.
