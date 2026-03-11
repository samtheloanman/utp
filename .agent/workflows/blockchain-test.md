---
description: Autonomous blockchain test, debug, and validate pipeline. Compiles contracts, runs all tests, auto-fixes failures, and validates security. Use for Solidity/Hardhat projects.
---

# /blockchain-test - Autonomous Blockchain Test Pipeline

$ARGUMENTS

// turbo-all

---

## Purpose

Fully autonomous pipeline that compiles, tests, debugs, and validates Solidity smart contracts. Runs recursively until all tests pass. No manual intervention needed.

---

## Pipeline Phases

### Phase 1: Compile Contracts
```bash
cd /Users/maysamtehranchi/Code/utp && npx hardhat compile 2>&1
```
- If compile fails → read error output, fix the Solidity file, re-compile
- If compile succeeds → proceed to Phase 2
- **Do NOT proceed to tests if compile fails**

### Phase 2: Run Full Test Suite
```bash
cd /Users/maysamtehranchi/Code/utp && npx hardhat test 2>&1
```
- Parse output for passing/failing counts
- If ALL tests pass → proceed to Phase 3
- If ANY test fails → proceed to Phase 2a (Auto-Debug)

### Phase 2a: Auto-Debug Failing Tests (RECURSIVE)

For each failing test:

1. **Read the error** — identify the error type:
   | Error Type | Fix Strategy |
   |------------|--------------|
   | `HH700: Artifact not found` | Missing contract — create it or fix the reference |
   | `revertedWith` wrong message | Check contract's actual revert string |
   | `TypeError: invalid BigNumberish` | Use `ethers.hexlify()` not `ethers.toBeHex()` for bytes |
   | `AssertionError: expected X to equal Y` | Fix test logic or contract logic |
   | `VM Exception: revert` | Check permissions, state, function args |
   | `Array out-of-bounds` | Wrong index — likely off-by-one in proposalId |

2. **Fix the issue** — edit the test file OR contract file
3. **Re-compile** if contract was modified:
   ```bash
   cd /Users/maysamtehranchi/Code/utp && npx hardhat compile 2>&1
   ```
4. **Re-run tests**:
   ```bash
   cd /Users/maysamtehranchi/Code/utp && npx hardhat test 2>&1
   ```
5. **Repeat** until 0 failures or max 5 iterations

**CRITICAL RULES:**
- Never change a passing test to make a failing test pass
- If a contract bug is found, fix the contract not the test
- If a test bug is found (wrong assertion, wrong setup), fix the test
- Log every fix made for the walkthrough

### Phase 3: Gas Report
```bash
cd /Users/maysamtehranchi/Code/utp && REPORT_GAS=true npx hardhat test 2>&1
```
- Capture gas usage per function
- Flag any function over 500K gas as a warning

### Phase 4: Security Quick Scan

Review each contract against the security checklist:
- [ ] All external calls have reentrancy guards or use CEI
- [ ] Every state-changing function has access control
- [ ] No `tx.origin` for authentication
- [ ] All state changes emit events
- [ ] Custom errors preferred over string reverts
- [ ] Empty signatures/proofs are rejected (downgrade protection)

Report findings — do NOT auto-fix security issues (flag them for review).

### Phase 5: Summary Report

Output a structured summary:

```markdown
## 🧪 Blockchain Test Report

### Compilation
- Status: ✅ PASS / ❌ FAIL
- Contracts compiled: X
- Warnings: Y

### Tests
- Total: X
- Passing: Y ✅
- Failing: Z ❌
- Auto-fixed: N issues

### Gas Report
| Contract | Function | Gas |
|----------|----------|-----|
| ... | ... | ... |

### Security Findings
- Critical: X
- High: Y
- Medium: Z

### Changes Made
- [file] — [what was fixed]
```

---

## Usage

```
/blockchain-test              — Full pipeline (compile + test + debug + gas + security)
/blockchain-test quick        — Compile + test only (skip gas and security)
/blockchain-test security     — Security scan only
```

---

## Key Principles

- **Autonomous**: Fix issues without asking — log what you did
- **Recursive**: Keep looping until green or max iterations hit
- **Non-destructive**: Never break passing tests to fix failing ones
- **Transparent**: Report every change in the summary
- **Security-aware**: Flag but don't auto-fix security concerns
