---
description: Recursively audit and improve blockchain contracts. Runs security, gas, PQ, and ZK analysis loops until all checks pass.
---

# /improve-contracts - Recursive Contract Improvement Pipeline

$ARGUMENTS

---

## Purpose

This workflow recursively audits and improves the UTP smart contracts across 5 dimensions until all checks pass. Each cycle identifies issues, applies fixes, and re-validates.

---

## Pipeline (Recursive Loop)

```
┌──────────────────────────────────────────────┐
│            IMPROVEMENT CYCLE                 │
│                                              │
│  1. COMPILE    → Fix errors/warnings         │
│  2. TEST       → Fix failures, add coverage  │
│  3. SECURITY   → Fix vulnerabilities         │
│  4. GAS AUDIT  → Optimize hot paths          │
│  5. PQ/ZK      → Harden crypto layer         │
│                                              │
│  ── All 5 pass? ──→ YES → DONE ✅            │
│         │                                     │
│         NO → Apply fixes → Re-run cycle ♻️    │
└──────────────────────────────────────────────┘
```

---

## Steps

### 1. Compile Check
// turbo
```bash
cd /Users/maysamtehranchi/Code/utp && node scripts/compile.js
```
- **Pass**: 0 errors, 0 warnings
- **Fail**: Fix Solidity issues, re-compile

### 2. Test Suite
```bash
cd /Users/maysamtehranchi/Code/utp && npx hardhat test
```
- **Pass**: All test suites green
- **Fail**: Debug failures, add missing tests, re-run
- **Coverage gaps**: Write new tests for untested functions

### 3. Security Audit

Run the `blockchain-quantum-specialist` agent's review checklist against each contract:

| File | Checks |
|------|--------|
| `contracts/core/DAO.sol` | Reentrancy, execute() access, batch overflow |
| `contracts/core/PermissionManager.sol` | Privilege escalation, ROOT_PERMISSION bypass |
| `contracts/core/PluginRegistry.sol` | Plugin install/uninstall safety |
| `contracts/core/Treasury.sol` | Withdrawal auth, fund accounting |
| `contracts/crypto/MockVerifiers.sol` | Downgrade attacks, empty signature handling |
| `contracts/plugins/GovernancePlugin.sol` | Vote manipulation, double-voting, PQ bypass |
| `contracts/plugins/StablecoinController.sol` | Mint overflow, pause bypass |

**For each finding:**
1. Classify severity: Critical / High / Medium / Low
2. Apply fix
3. Add regression test
4. Re-run steps 1-2

### 4. Gas Optimization

Profile gas for key operations:

| Operation | Budget | Action if over |
|-----------|--------|----------------|
| `DAO.execute()` (1 target) | <100K gas | Optimize calldata handling |
| `GovernancePlugin.createProposal()` | <150K gas | Pack storage, use events |
| `GovernancePlugin.castVoteHybrid()` | <200K gas | Cache storage reads |
| `GovernancePlugin.castVoteZK()` | <200K gas | Optimize proof decode |
| `PermissionManager.grant()` | <80K gas | Minimal storage writes |
| `Treasury.withdraw()` | <80K gas | Single SSTORE pattern |

**Techniques to apply:**
- `calldata` over `memory` for external params
- Custom errors over `require("strings")`
- `immutable` for constructor-set values
- Storage slot packing for structs
- Cache storage reads in local variables

### 5. PQ/ZK Hardening

**Post-Quantum Checks:**
- [ ] `IQuantumVerifier.verify()` rejects empty signatures → downgrade prevention
- [ ] `IQuantumVerifier.verify()` rejects signatures < minimum length
- [ ] Hybrid auth requires BOTH ECC AND PQ to pass (no OR logic)
- [ ] Algorithm name is queryable for audit logging
- [ ] Mock verifier accurately simulates real verification constraints

**Zero-Knowledge Checks:**
- [ ] `IZKVerifier.verify()` validates proof structure before processing
- [ ] Nullifiers are tracked to prevent double-voting (not just commented "ideally")
- [ ] Public inputs include chainId to prevent cross-chain replay
- [ ] Anonymous votes emit events without revealing voter identity

**For each gap:**
1. Implement fix in Solidity
2. Add test case
3. Re-run compile + test

---

## Cycle Completion Criteria

All 5 must pass to exit the loop:

| Check | Criteria |
|-------|----------|
| ✅ Compile | 0 errors, 0 warnings |
| ✅ Tests | All pass, no untested public functions |
| ✅ Security | No Critical or High findings |
| ✅ Gas | All operations within budget |
| ✅ PQ/ZK | All hardening checklist items addressed |

---

## Post-Improvement

After all cycles pass:

1. **Commit**: `git add -A && git commit -m "improve: recursive contract hardening cycle N"`
2. **Log**: Update `checklist.md` with findings and fixes
3. **Report**: Summary of changes, gas savings, and security fixes

---

## Usage

```
/improve-contracts                          # Full pipeline
/improve-contracts security only            # Only security audit
/improve-contracts gas optimize Treasury    # Gas audit on specific contract
/improve-contracts pq harden               # PQ/ZK hardening only
```

---

## Caution

- **Never deploy without completing ALL cycles**
- **Breaking changes**: If a fix changes function signatures, update ALL callers + tests
- **Mock vs Real**: PQ/ZK improvements to mocks should mirror real algorithm constraints
- **Gas budgets are guidelines**: RSK gas costs may differ from Ethereum mainnet
