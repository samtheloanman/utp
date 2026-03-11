---
name: blockchain-development
description: Blockchain development patterns, Hardhat/Foundry workflows, DeFi protocols, smart contract security, cross-chain patterns, tokenomics, and enterprise integration. Use when building or reviewing Solidity contracts, deploying to EVM chains, auditing security, or designing decentralized systems.
---

# Blockchain Development Skill

## When to Use
- Writing, reviewing, or auditing Solidity smart contracts
- Designing DeFi protocols, DAOs, or token systems
- Deploying to EVM chains (Ethereum, RSK, Arbitrum, Optimism, Base)
- Setting up Hardhat/Foundry dev environments
- Security auditing and vulnerability assessment
- Gas optimization and contract size reduction
- Oracle integration and cross-chain bridges
- Enterprise blockchain and compliance patterns

## When NOT to Use
- Non-blockchain web development (use `frontend-design` or `nextjs-best-practices`)
- Database design (use `database-design`)
- General backend work (use `nodejs-best-practices`)

---

## Development Toolchain

### Hardhat (Primary - This Project)
```
# Compile
npx hardhat compile

# Test (Mocha + Chai + hardhat-chai-matchers)
npx hardhat test

# Test single file
npx hardhat test test/core/DAO.test.js

# Gas report
REPORT_GAS=true npx hardhat test

# Coverage
npx hardhat coverage

# Deploy to testnet
npx hardhat run scripts/deploy.js --network rskTestnet

# Verify
npx hardhat verify --network rskTestnet <address> <constructor-args>
```

### Foundry (Alternative)
```
# Compile
forge build

# Test with gas report
forge test -vvv --gas-report

# Fuzz testing
forge test --match-test testFuzz

# Invariant testing
forge test --match-contract InvariantTest

# Security analysis
forge inspect <Contract> abi
```

### Config Requirements (ESM Project + Hardhat v2)
```
# When package.json has "type": "module":
# - Use hardhat.config.cjs (CommonJS format)
# - Test files can use ESM imports (import { expect } from "chai")
# - Required packages: @nomicfoundation/hardhat-toolbox, 
#   @nomicfoundation/hardhat-chai-matchers, @nomicfoundation/hardhat-ethers
```

---

## Smart Contract Patterns

### Security First (CEI Pattern)
```solidity
// ALWAYS: Checks → Effects → Interactions
function withdraw(uint256 amount) external {
    // 1. CHECKS
    require(balances[msg.sender] >= amount, "Insufficient");
    
    // 2. EFFECTS (state change BEFORE external call)
    balances[msg.sender] -= amount;
    
    // 3. INTERACTIONS (external call LAST)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

### Access Control (Permission Manager Pattern)
```solidity
// (where, who, permissionId) triple — Aragon-inspired
mapping(address => mapping(address => mapping(bytes32 => bool))) permissions;

function hasPermission(address where, address who, bytes32 permissionId) 
    public view returns (bool) {
    return permissions[where][who][permissionId] 
        || permissions[address(this)][who][ROOT_PERMISSION_ID];
}
```

### Crypto-Agility (Interface Pattern)
```solidity
// Swap verification algorithms without redeploying core
interface IQuantumVerifier {
    function verify(bytes memory publicKey, bytes32 messageHash, bytes memory signature) 
        external view returns (bool);
    function algorithm() external pure returns (string memory);
}
```

### Gas Optimization Quick Reference
| Technique | Savings |
|-----------|---------|
| `calldata` over `memory` for external params | ~60 gas/param |
| Custom errors over `require("string")` | ~50 gas each |
| `immutable` over storage read | ~2100 gas (cold SLOAD) |
| Pack structs (uint128 + uint128 in one slot) | ~20K gas |
| Cache storage reads in memory | ~2100 gas per cached read |
| `unchecked` for known-safe math | ~20-40 gas per op |
| Short-circuit `&&` / `||` | Variable |

---

## Testing Patterns

### Test File Structure
```javascript
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ContractName", function () {
  let contract;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ContractName");
    contract = await Factory.deploy(/* constructor args */);
  });

  describe("Deployment", function () {
    it("Should set initial state correctly", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Access Control", function () {
    it("Should reject unauthorized calls", async function () {
      await expect(
        contract.connect(user1).adminFunction()
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });
  });

  describe("Events", function () {
    it("Should emit on state change", async function () {
      await expect(contract.doThing(42))
        .to.emit(contract, "ThingDone")
        .withArgs(42);
    });
  });
});
```

### Common Testing Gotchas
- `ethers.hexlify(ethers.toUtf8Bytes("data"))` — NOT `ethers.toBeHex()` for arbitrary bytes
- Solidity structs with mappings: auto-getters skip dynamic arrays and mappings
- `revertedWith` checks the outer revert, not inner (DAO wraps with "execution failed")
- Mocha `beforeEach` runs fresh per `it()` — proposal IDs reset to 0 each test
- Use `ethers.getSigners()` indices carefully to avoid address reuse across tests

---

## Security Checklist

### Pre-Deployment Audit
- [ ] All external calls have reentrancy guards or use CEI
- [ ] Every state-changing function has access control
- [ ] Integer overflow protected (Solidity ^0.8.x built-in)
- [ ] Front-running mitigated (commit-reveal or time-weighted)
- [ ] No unbounded loops or storage writes in loops
- [ ] Flash loan safety (no single-block price manipulation)
- [ ] Upgrade safety (storage layout preserved for proxies)
- [ ] PQ downgrade protection (empty signatures rejected)
- [ ] ZK nullifiers tracked to prevent double-voting
- [ ] All state changes emit events
- [ ] Custom errors used over string reverts
- [ ] Replay protection: nonce + chainId in signed messages
- [ ] No `tx.origin` for authentication
- [ ] `pull > push` pattern for ETH transfers
- [ ] Emergency pause mechanism for critical contracts

### Anti-Patterns to Catch
| Pattern | Risk | Fix |
|---------|------|-----|
| `call{value}` without guard | Reentrancy | Add nonReentrant |
| `block.timestamp` for random | Miner manipulation | Use VRF or commit-reveal |
| Unchecked `transfer` return | Silent failure | Use SafeERC20 |
| Storage writes in loops | Gas bomb | Cache in memory |
| `delegatecall` to untrusted | Storage collision | Only to audited contracts |
| Empty `receive()` | Lost funds | Log or reject unexpected ETH |

---

## DeFi Protocol Patterns

### AMM (Automated Market Maker)
- Constant product formula: `x * y = k`
- Concentrated liquidity (Uniswap V3): tick-based positions
- Consider MEV: use time-weighted average prices (TWAP)

### Lending Protocol
- Collateral factor, liquidation threshold, health factor
- Interest rate models: utilization-based (kink model)
- Flash liquidations for underwater positions

### Governance
- Token-weighted vs 1-person-1-vote vs conviction voting
- Quorum requirements, voting periods, execution delay
- Timelock for parameter changes (minimum 24-48h for critical)

### Tokenomics
- Vesting schedules: linear, cliff, milestone-based
- Bonding curves for price discovery
- Staking: lock periods, slashing conditions, reward distribution

---

## Deployment Targets

### RSK (Rootstock) — This Project
- EVM-compatible, Solidity works natively
- Gas token: RBTC (pegged to BTC)
- Block time: ~30s (vs ETH 12s)
- Merge-mined with Bitcoin
- Test on RSK-specific testnets (precompiles may differ)

### Ethereum Mainnet
- Gas: 15-200+ gwei, plan for ~$5-50 per tx
- Deployment: use verified proxies for upgradeability
- EIP-1559: base fee + priority fee

### L2 Chains (Arbitrum, Optimism, Base)
- 10-100x cheaper gas than mainnet
- Bridging delay: ~7 days for optimistic rollups
- Different block times and gas limits

---

## Quality Control Loop

After editing ANY Solidity file:
1. **Compile**: `npx hardhat compile` — 0 errors
2. **Test**: `npx hardhat test` — all pass
3. **Security**: No reentrancy, no unchecked external calls
4. **Gas**: Check gas for modified functions
5. **Events**: All state changes emit events
6. **Threat Model**: Update THREAT_MODEL.md if attack surface changed

---

## Security Analysis Tools

### Static Analysis
```bash
# Slither — fast vulnerability detection
slither . --exclude-dependencies

# Mythril — symbolic execution
myth analyze contracts/core/DAO.sol

# Semgrep — custom smart contract rules
semgrep --config "p/smart-contracts" .
```

### Fuzz Testing (Foundry)
```solidity
function testFuzz_Withdraw(uint256 amount) public {
    amount = bound(amount, 1, type(uint128).max);
    vm.deal(address(vault), amount);
    vault.deposit{value: amount}();
    uint256 before = address(this).balance;
    vault.withdraw(amount);
    assertEq(address(this).balance, before + amount);
}
```

### Invariant Testing (Foundry)
```solidity
function invariant_TreasuryNeverNegative() public {
    assertGe(address(treasury).balance, 0);
}
function invariant_PermissionsConsistent() public {
    // ROOT holder always has ROOT permission
    assertTrue(dao.hasPermission(address(dao), rootHolder, ROOT_PERMISSION_ID));
}
```

---

## Incident Response Playbook

### 1. Detection
```bash
# Monitor contract events for anomalies
cast logs --address $CONTRACT --from-block latest
```

### 2. Mitigation
- Activate emergency pause if available
- Revoke compromised permissions via ROOT
- Coordinate responsible disclosure

### 3. Recovery
- Assess damage scope and affected balances
- Deploy patched contract with audit
- Migrate state if using proxy pattern

---

## DeFi Audit Additions

### Pre-Audit
- [ ] Code compiles with zero warnings
- [ ] Tests pass with >90% line coverage
- [ ] All external dependencies pinned to exact versions

### DeFi Specific
- [ ] Oracle staleness checks (Chainlink heartbeat)
- [ ] Slippage protection on swaps
- [ ] Flash loan resistance (no single-tx price manipulation)
- [ ] Sandwich attack prevention (deadline + slippage params)
- [ ] Precision loss check (multiply before divide)

---

## Solidity Troubleshooting

### "Stack too deep"
```solidity
// Solution 1: Use struct to group params
struct Params { uint256 a; uint256 b; uint256 c; }

// Solution 2: Block scoping
{ uint256 temp = x + y; result = temp * z; }

// Solution 3: Extract to internal function
function _helper(uint256 a, uint256 b) internal returns (uint256) { }
```

### "Contract size exceeds 24KB limit"
```bash
# Check contract sizes
forge build --sizes         # Foundry
npx hardhat size-contracts  # Hardhat (with hardhat-contract-sizer)
```
Solutions: Split into libraries, use Diamond pattern (EIP-2535), or enable `viaIR` optimizer.

### "Precision Loss"
```solidity
// WRONG: Division before multiplication
uint256 fee = (amount / 1000) * rate;

// CORRECT: Multiply first
uint256 fee = (amount * rate) / 1000;
```

