/**
 * Governance parameters per network (roadmap decision D2 + Council Q3).
 * Rootstock Testnet (Chain 31) blocks average ~25.82s:
 *   - Default 2880 blocks ≈ 20.7 hours.
 *   - Set RSK_TESTNET_VOTING_PERIOD=90 (~39m) for fast QA rehearsals.
 */
const { ethers } = require("ethers");

const ZERO = "0x0000000000000000000000000000000000000000";

function parseMinBalanceWei(raw, fallback) {
  const trimmed = raw === undefined || raw === null ? "" : String(raw).trim();
  if (!trimmed) return fallback;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `Invalid RSK_TESTNET_MIN_BALANCE_WEI="${raw}": expected a non-negative integer in wei`
    );
  }
  return BigInt(trimmed);
}

function buildDeployConfig(env = process.env) {
  return {
    hardhat: {
      chainId: 31337,
      initialSupply: ethers.parseEther("10000000"),
      votingDelay: 1,
      votingPeriod: 20,
      proposalThreshold: ethers.parseEther("1000"),
      quorumPercent: 4,
      timelockMinDelay: 60,
      guardian: ZERO,
      minDeployerBalance: 0n,
    },
    localhost: {
      chainId: 31337,
      initialSupply: ethers.parseEther("10000000"),
      votingDelay: 1,
      votingPeriod: 20,
      proposalThreshold: ethers.parseEther("1000"),
      quorumPercent: 4,
      timelockMinDelay: 60,
      guardian: ZERO,
      minDeployerBalance: 0n,
    },
    rskTestnet: {
      chainId: 31,
      initialSupply: ethers.parseEther("10000000"), // 10M UTP to deployer for 4-role distribution
      votingDelay: 1,
      votingPeriod: Number(env.RSK_TESTNET_VOTING_PERIOD || 2880),
      proposalThreshold: ethers.parseEther("10000"), // 0.1% of initial supply
      quorumPercent: 4,
      timelockMinDelay: 3600, // 1 hour
      guardian: env.GUARDIAN_ADDRESS || ZERO,
      minDeployerBalance: parseMinBalanceWei(
        env.RSK_TESTNET_MIN_BALANCE_WEI,
        ethers.parseEther("0.0004") // tRBTC for deploy + gas stipends
      ),
    },
    utpAlpha: {
      chainId: Number(env.UTP_ALPHA_CHAIN_ID || 99931),
      initialSupply: ethers.parseEther("10000000"),
      votingDelay: 1,
      votingPeriod: Number(env.UTP_ALPHA_VOTING_PERIOD || 300),
      proposalThreshold: ethers.parseEther("10000"),
      quorumPercent: 4,
      timelockMinDelay: Number(env.UTP_ALPHA_TIMELOCK_DELAY || 3600),
      guardian: env.GUARDIAN_ADDRESS || ZERO,
      minDeployerBalance: 0n,
    },
    // rskMainnet intentionally absent: blocked until Phase 3 (audit) passes.
  };
}

const config = buildDeployConfig(process.env);
Object.defineProperty(config, "buildDeployConfig", {
  value: buildDeployConfig,
  enumerable: false,
});

module.exports = config;
