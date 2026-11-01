/**
 * Governance parameters per network (roadmap decision D2).
 * RSK blocks average ~30s: 2880 blocks ≈ 1 day.
 * Change these, not the deploy script.
 */
const { ethers } = require("ethers");

const ZERO = "0x0000000000000000000000000000000000000000";

module.exports = {
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
    initialSupply: ethers.parseEther("10000000"), // 10M UTP to deployer for tester distribution
    votingDelay: 1, // ~30s
    votingPeriod: 2880, // ~1 day
    proposalThreshold: ethers.parseEther("10000"), // 0.1% of initial supply
    quorumPercent: 4,
    timelockMinDelay: 3600, // 1 hour
    guardian: process.env.GUARDIAN_ADDRESS || ZERO, // optional emergency canceller (multisig recommended)
    minDeployerBalance: ethers.parseEther("0.01"), // tRBTC for gas
  },
  // rskMainnet intentionally absent: blocked until Phase 3 (audit) passes.
};
