# THREAT_MODEL.md — Bitcoin DAO Framework

## Overview

This document identifies threats, attack vectors, and mitigations for the Bitcoin DAO Framework's Solidity smart contracts deployed on RSK (Rootstock).

---

## System Architecture

```
┌──────────────────────────────────────────┐
│              DAO (Kernel)                 │
│  PermissionManager ← (where, who, permId)│
│  execute() ← nonReentrant                │
└──────────┬───────────────────────────────┘
           │ EXECUTE_PERMISSION
     ┌─────┴──────────────────┐
     │                        │
┌────▼─────┐          ┌──────▼────────┐
│ Treasury │          │ GovernancePlugin│
│ withdraw │          │ castVoteHybrid │
│ withdrawERC20│      │ castVoteZK     │
└──────────┘          └───────┬────────┘
                              │ verifies via
                    ┌─────────┴──────────┐
                    │                    │
              ┌─────▼───────┐    ┌──────▼──────┐
              │IQuantumVerifier│  │ IZKVerifier │
              │(MockDilithium) │  │(MockGroth16)│
              └────────────────┘  └─────────────┘
```

---

## Threat Categories

### T1: Permission System Exploits

| Threat | Severity | Status |
|--------|----------|--------|
| Unauthorized ROOT_PERMISSION escalation | **Critical** | ✅ Mitigated — only ROOT holders can grant/revoke |
| ROOT holder compromise (private key theft) | **Critical** | ✅ Mitigated — DAO ownership transferred to TimelockController |
| Permission bypass via direct contract call | **High** | ✅ Mitigated — `onlyDAO` modifier on Treasury/Stablecoin |

**Recommendations:**
- Add timelock for ROOT permission transfers
- Implement multi-sig requirement for ROOT operations
- Consider role expiration / rotation mechanisms

---

### T2: Reentrancy Attacks

| Threat | Severity | Status |
|--------|----------|--------|
| DAO.execute() reentrancy | **Critical** | ✅ Mitigated — `_locked` flag in nonReentrant modifier |
| Treasury.withdraw() reentrancy via malicious recipient | **High** | ⚠️ Partial — relies on DAO-level reentrancy guard |
| Cross-function reentrancy | **Medium** | ✅ Mitigated — execute is the only state-changing entry |

**Recommendations:**
- Consider OpenZeppelin's `ReentrancyGuard` for production
- Add reentrancy guard to Treasury independently

---

### T3: Governance Manipulation

| Threat | Severity | Status |
|--------|----------|--------|
| Flash-vote attacks | **Critical** | ✅ Mitigated — only token holders can vote |
| Replay attacks on hybrid votes | **High** | ✅ Mitigated — messageHash includes proposalId + msg.sender + contract address |
| ZK nullifier reuse (double-voting) | **High** | ✅ Mitigated — `usedNullifiers` mapping prevents reuse |
| Proposal front-running | **Medium** | ⚠️ Active Risk — no commit-reveal scheme |

**Recommendations:**
- Increase EXECUTION_THRESHOLD for production (quorum-based)
- Implement nullifier tracking mapping for ZK votes
- Add voting period enforcement (start/end blocks)
- Consider commit-reveal voting to prevent front-running

---

### T4: Cryptographic Downgrade Attacks

| Threat | Severity | Status |
|--------|----------|--------|
| Empty PQ signature bypass | **Critical** | ✅ Mitigated — MockQuantumVerifier rejects empty sigs |
| Empty ZK proof bypass | **Critical** | ✅ Mitigated — MockZKVerifier rejects empty proofs |
| Weak mock verifier in production | **Critical** | ⚠️ Design Risk — mocks must be replaced pre-mainnet |

**Recommendations:**
- Implement real Dilithium/SPHINCS+ verifier before mainnet
- Implement real Groth16/Plonk verifier before mainnet
- Add verifier address immutability or DAO-governed upgrade path

---

### T5: Treasury and Fund Safety

| Threat | Severity | Status |
|--------|----------|--------|
| Unauthorized fund withdrawal | **Critical** | ✅ Mitigated — onlyDAO modifier |
| ERC20 token draining | **High** | ✅ Mitigated — onlyDAO modifier |
| Failed transfer DoS (unchecked return) | **Medium** | ✅ Mitigated — low-level call with return check |
| Treasury balance manipulation via selfdestruct | **Low** | ℹ️ Informational — receive() accepts any ETH |

**Recommendations:**
- Add withdrawal limits / daily caps
- Implement emergency pause on Treasury
- Add balance change event monitoring

---

### T6: Plugin Registry Risks

| Threat | Severity | Status |
|--------|----------|--------|
| Malicious plugin installation | **High** | ✅ Mitigated — ROOT_PERMISSION required |
| Plugin-granted permissions persist after uninstall | **Medium** | ✅ Mitigated — `EXECUTE_PERMISSION` is revoked on uninstall |
| Plugin index manipulation | **Low** | ✅ Mitigated — swap-and-pop pattern |

**Recommendations:**
- Auto-revoke EXECUTE_PERMISSION on plugin uninstall
- Add plugin allowlist / bytecode verification
- Track permissions granted per-plugin for clean teardown

---

### T7: StablecoinController Risks

| Threat | Severity | Status |
|--------|----------|--------|
| Unauthorized parameter changes | **High** | ✅ Mitigated — onlyDAO modifier |
| No daily mint aggregation | **Medium** | ✅ Mitigated — `dailyMinted` state tracks daily mints |
| No access control on mint() | **High** | ✅ Mitigated — `onlyMinter` modifier restricts access |

**Recommendations:**
- Add MINTER_ROLE permission check on mint()
- Implement cumulative daily mint tracking with epoch reset
- Add maximum fee / parameter bounds

---

### T8: Replay Protection

| Threat | Severity | Status |
|--------|----------|--------|
| Cross-chain replay (same contracts on different chains) | **High** | ✅ Mitigated — `chainId` included in vote hash |
| Nonce-based replay | **Medium** | ⚠️ Active Risk — no nonce tracking |
| Same-chain tx replay | **Low** | ✅ Mitigated — Ethereum nonce prevents raw tx replay |

**Recommendations:**
- Add `block.chainid` to hybrid vote messageHash
- Add nonce per-voter for sequential vote ordering
- Add EIP-712 typed structured data for signing

---

## Risk Matrix

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| **P1** | Mock verifiers in production | No real cryptographic security | High |
| 

---

## Testing Coverage Summary

| Contract | Unit Tests | Key Scenarios |
|----------|-----------|---------------|
| PermissionManager | 9 tests ✅ | Grant, revoke, ROOT inheritance, events |
| DAO | 13 tests ✅ | Execute, batch, reentrancy, permissions |
| PluginRegistry | 16 tests ✅ | Install, uninstall, reorganize, auth |
| Treasury | 9 tests ✅ | Withdraw native, ERC20, auth, events |
| MockVerifiers | 8 tests ✅ | PQ verify, ZK verify, downgrade protection |
| GovernancePlugin | 15 tests ✅ | Hybrid vote, ZK vote, execution, double-vote |
| StablecoinController | 12 tests ✅ | Parameters, pause, mint limits, governance |
| Integration | 3 tests ✅ | Full governance flow E2E |
| **Total** | **89 tests ✅** | **All passing** |

## Governance core (updated 2026-10-18)

Scope: DAO, UTPToken, UtPTimelock (OZ TimelockController), GovernancePlugin (OZ Governor), Treasury, PluginRegistry.

| Threat | Mitigation | Test |
|---|---|---|
| Deployer keeps control after launch | `deployCore` revokes deployer ROOT and renounces timelock admin; `verifyCore` asserts 11 invariants on every deploy | `GovernancePlugin.test.js` "Deployment invariants"; deploy log |
| Governance bypasses the delay | GovernancePlugin holds no DAO permission; only the timelock (ROOT) executes | "routes execution through the timelock" |
| Anyone schedules timelock operations | Governance is the only PROPOSER | "rejects direct scheduling on the timelock" |
| Malicious proposal passes | Timelock delay gives a window; optional guardian (multisig) holds CANCELLER only | "lets the guardian cancel"; "does not let the guardian do anything else" |
| Flash-loan / late-acquired votes | Weight and quorum read from ERC20Votes snapshot at proposal start | "weights votes by delegated UTP at the snapshot" |
| Proposal spam | Proposal threshold (10,000 UTP on testnet) | "blocks proposers below the threshold" |
| Vote after close / before open | OZ Governor state checks | "Voting window" tests |
| Double vote | OZ `GovernorAlreadyCastVote` | "rejects a second vote" |
| Plugin privilege escalation | PluginRegistry holds only `UNINSTALL_PLUGIN_PERMISSION`; `revokePluginExecute` can only remove EXECUTE | `PluginRegistry.test.js` "Least privilege" |
| PQ downgrade (hybrid mode) | Enforced in `_castVote`, so `castVote`/`castVoteBySig` cannot skip it; empty sig rejected | "Hybrid post-quantum mode" tests |
| PQ signature replay | Digest binds proposalId, voter, support, contract, chainId | "rejects a signature replayed by a different voter" / "different choice" |

Known risks / accepted for testnet:
- **Initial concentration:** the deployer receives 100% of the initial UTP supply and alone exceeds quorum until tokens are distributed and delegated. Distribute before treating any vote as meaningful.
- **No real PQ verifier:** `ZKNOX_ethdilithium.sol` is an interface; upstream marks it unaudited. Hybrid mode stays off (decision D1).
- **Not audited:** the governance core composes audited OpenZeppelin modules, but the DAO/PermissionManager/Treasury/PluginRegistry code is custom and unaudited. External audit is a Phase 3 gate before mainnet.
- **Guardian trust:** if set, the guardian can veto (cancel) any queued operation. Use a multisig.
