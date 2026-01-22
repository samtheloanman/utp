# Mission Plan: Bitcoin DAO Framework (UTP)

## Overview
Build a decentralized autonomous organization (DAO) framework for Bitcoin Layer 2 (L2) with native support for Zero-Knowledge (ZK) proofs and Post-Quantum (PQ) cryptography. This framework, inspired by Aragon OSx, provides a modular "Kernel + Plugins" architecture tailored for the Bitcoin ecosystem, focusing on organizations managing stablecoins and assets on L2.

## Project Type
**BACKEND** (Protocol/Smart Contracts)

## Success Criteria
- [ ] Successful deployment of DAO kernel to RSK-equivalent environment.
- [ ] Verified execution of a proposal via **Hybrid Auth** (secp256k1 + Mock Dilithium).
- [ ] Demonstrable **ZK-gated anonymous voting** logic (Mock Semaphore).
- [ ] Plugin lifecycle: Install, Update, Uninstall (with safety checks).
- [ ] Zero critical vulnerabilities identified by `security-auditor` in the Permission system.

## Tech Stack
- **L2 Baseline**: Rootstock (RSK) for EVM compatibility and BTC-settlement.
- **Smart Contracts**: Solidity ^0.8.20.
- **Framework**: Foundry (for fast cryptographic testing).
- **Crypto Agility**: Custom `IQuantumVerifier` and `IZKVerifier` interfaces.
- **Identity/Treasury**: Aragon-inspired Permission Manager + Safe-inspired Executor.

## File Structure
```text
contracts/
├── core/
│   ├── DAO.sol (Kernel)
│   ├── PermissionManager.sol
│   ├── PluginRegistry.sol
│   ├── Executor.sol
│   └── Treasury.sol
├── crypto/
│   ├── IQuantumVerifier.sol
│   ├── IZKVerifier.sol
│   └── MockVerifiers.sol
└── plugins/
    ├── GovernancePlugin.sol
    └── StablecoinController.sol
test/
├── core/
├── plugins/
└── integration/
```

## Strategic Pillars
1. **Bitcoin Native**: Target Bitcoin L2s (initially Rootstock/RSK) for security and settlement.
2. **ZK-First**: Enable anonymous membership and private voting as core plugins.
3. **Quantum-Resistant**: Implement crypto-agility to future-proof against quantum threats.
4. **Aragon-Inspired**: Provide a familiar, modular plugin architecture.

## Red Team Findings & Improvements (Security Auditor / Backend Specialist)
1. **Downgrade Attack Risk**: The system must ensure that if a plugin requires `HYBRID_ECC_PLUS_PQ`, an attacker cannot bypass the PQ check by providing a null/empty signature if the verifier is misconfigured.
2. **Plugin Privilege Escalation**: The `PermissionManager` must explicitly restrict plugins from modifying the `PermissionManager` itself unless they have an `ADMIN_PERMISSION`.
3. **Gas Cost Profiling**: RSK has gas limits that might be hit by large PQ signatures or ZK proof verification. Early task: profile gas for Mock verifiers to set a performance budget.
4. **Replay Protection**: Every DAO action must include a `nonce` and `chainId` to prevent transactions from being replayed on Bitcoin L1 or other L2 forks.

## Task Breakdown
### Phase 1: Foundation (Agent: security-auditor, backend-specialist)
1. [ ] Implement `IQuantumVerifier` and `IZKVerifier` interfaces.
   - **Input**: Requirements for Dilithium/Semaphore.
   - **Output**: Solidity Interfaces.
   - **Verify**: Compilation check.
2. [ ] Create `MockVerifiers.sol` with logic to simulate passes/fails.
   - **Input**: Interface definitions.
   - **Output**: Mock implementations.
   - **Verify**: Unit tests showing successful/failed verification based on input.

### Phase 2: Core Implementation (Agent: backend-specialist)
3. [ ] Implement `PermissionManager.sol` with Role-Based Access Control.
   - **Input**: Requirements for grant/revoke/hasPermission.
   - **Output**: Contract file.
   - **Verify**: Tests for unauthorized permission checks.
4. [ ] Implement `DAO.sol` and `Executor.sol`.
   - **Input**: Aragon OSx architecture.
   - **Output**: Core Kernel.
   - **Verify**: Ability to execute a simple transfer from the kernel.

### Phase 3: Plugins & Execution (Agent: backend-specialist)
5. [ ] Implement `GovernancePlugin.sol` with Hybrid / ZK gating.
   - **Input**: Voting logic reqs.
   - **Output**: Plugin contract.
   - **Verify**: Proposal execution gated by both ECC and Mock PQ.
6. [ ] Implement `StablecoinController.sol` skeleton.

## Phase X: Final Verification
- [ ] Run `forge test` - All tests pass.
- [ ] Run `python scripts/security_scan.py .` - No critical findings.
- [ ] Verify no "magic numbers" or hardcoded addresses in core contracts.
- [ ] Documentation check: `docs/THREAT_MODEL.md` exists and covers bridge risks.
