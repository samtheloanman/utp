/**
 * Multi-signer UTP token distribution & pre-proposal delegation assertions (Council Q3).
 *
 * Enforces strict 4-role separation:
 *   - deployer  -> 0 UTP balance, 0 voting weight post-distribution
 *   - voterA    -> 250,000 UTP
 *   - voterB    -> 250,000 UTP (200,000 when voterC is set)
 *   - voterC    -> optional third voter, 50,000 UTP (PRD: 3 distinct tester wallets)
 *   - guardian  -> non-deployer emergency timelock canceller (0 UTP required)
 *   - timelock  -> remaining 9,500,000 UTP treasury reserve
 *
 * CLI usage:
 *   VOTER_A_ADDRESS=0x... VOTER_B_ADDRESS=0x... [VOTER_C_ADDRESS=0x...] GUARDIAN_ADDRESS=0x... \
 *     npx hardhat run scripts/distribute-testnet.cjs --network rskTestnet
 */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const VOTER_ALLOCATION = ethers.parseEther("250000");
const VOTER_C_ALLOCATION = ethers.parseEther("50000");
const EXPECTED_TREASURY_REMAINDER = ethers.parseEther("9500000");
const DEFAULT_STIPEND_WEI = ethers.parseEther("0.002");
const MIN_NATIVE_BALANCE = ethers.parseEther("0.001");
const LOCAL_NETWORKS = new Set(["hardhat", "localhost"]);

function log(logger, msg) {
  if (logger) logger(msg);
}

async function resolveAddress(label, accountOrAddress) {
  if (!accountOrAddress) {
    throw new Error(`Missing required address for ${label}`);
  }
  const raw =
    typeof accountOrAddress === "string"
      ? accountOrAddress
      : typeof accountOrAddress.getAddress === "function"
        ? await accountOrAddress.getAddress()
        : accountOrAddress.address;

  if (!raw || !ethers.isAddress(raw)) {
    throw new Error(`Invalid address for ${label}: ${String(raw)}`);
  }
  const checksummed = ethers.getAddress(raw);
  if (checksummed === ethers.ZeroAddress) {
    throw new Error(`Role ${label} must not be ZeroAddress`);
  }
  return checksummed;
}

function assertDistinctRoles({ deployerAddr, voterAAddr, voterBAddr, voterCAddr, guardianAddr, timelockAddr }) {
  const roleEntries = [
    ["deployer", deployerAddr],
    ["voterA", voterAAddr],
    ["voterB", voterBAddr],
    ["guardian", guardianAddr],
  ];
  if (voterCAddr) roleEntries.push(["voterC", voterCAddr]);

  const seen = new Map();
  for (const [role, addr] of roleEntries) {
    const lower = addr.toLowerCase();
    if (seen.has(lower)) {
      throw new Error(
        `4-role separation violation: ${role} (${addr}) duplicates ${seen.get(lower)}`
      );
    }
    seen.set(lower, role);
  }

  if (timelockAddr.toLowerCase() === deployerAddr.toLowerCase()) {
    throw new Error("timelockAddress must be distinct from deployer");
  }
}

/**
 * Distributes 250k UTP to voterA, 250k UTP to voterB, and the remaining 9.5M UTP
 * to timelockAddress; optionally tops up native gas stipends; verifies 0 residual deployer power.
 */
async function distributeAndVerify({
  token,
  deployer,
  voterA,
  voterB,
  voterC,
  guardian,
  timelockAddress,
  stipendWei = 0n,
  logger,
}) {
  if (!token) throw new Error("token contract instance is required");
  if (!deployer || typeof deployer === "string") {
    throw new Error("deployer must be an ethers Signer capable of signing transfers");
  }

  const deployerAddr = await resolveAddress("deployer", deployer);
  const voterAAddr = await resolveAddress("voterA", voterA);
  const voterBAddr = await resolveAddress("voterB", voterB);
  const voterCAddr = voterC ? await resolveAddress("voterC", voterC) : null;
  const voterBAllocation = voterCAddr ? VOTER_ALLOCATION - VOTER_C_ALLOCATION : VOTER_ALLOCATION;
  const guardianAddr = await resolveAddress("guardian", guardian);
  const timelockAddr = await resolveAddress("timelockAddress", timelockAddress);

  assertDistinctRoles({
    deployerAddr,
    voterAAddr,
    voterBAddr,
    voterCAddr,
    guardianAddr,
    timelockAddr,
  });

  const tokenAsDeployer = token.connect(deployer);

  // If deployer previously self-delegated, clear delegation before zeroing balance.
  const priorDelegate = await token.delegates(deployerAddr);
  if (priorDelegate !== ethers.ZeroAddress) {
    await (await tokenAsDeployer.delegate(ethers.ZeroAddress)).wait();
  }

  const initialBalance = await token.balanceOf(deployerAddr);
  const minRequired = VOTER_ALLOCATION * 2n;
  if (initialBalance <= minRequired) {
    throw new Error(
      `Deployer UTP balance (${ethers.formatEther(initialBalance)}) insufficient for distribution`
    );
  }

  log(logger, `Transferring ${ethers.formatEther(VOTER_ALLOCATION)} UTP -> voterA (${voterAAddr})`);
  await (await tokenAsDeployer.transfer(voterAAddr, VOTER_ALLOCATION)).wait();

  log(logger, `Transferring ${ethers.formatEther(voterBAllocation)} UTP -> voterB (${voterBAddr})`);
  await (await tokenAsDeployer.transfer(voterBAddr, voterBAllocation)).wait();

  if (voterCAddr) {
    log(logger, `Transferring ${ethers.formatEther(VOTER_C_ALLOCATION)} UTP -> voterC (${voterCAddr})`);
    await (await tokenAsDeployer.transfer(voterCAddr, VOTER_C_ALLOCATION)).wait();
  }

  const remaining = await token.balanceOf(deployerAddr);
  if (remaining !== EXPECTED_TREASURY_REMAINDER) {
    log(
      logger,
      `Note: remaining treasury balance is ${ethers.formatEther(remaining)} UTP (standard supply expects 9,500,000 UTP)`
    );
  }
  log(logger, `Transferring ${ethers.formatEther(remaining)} UTP -> timelock (${timelockAddr})`);
  await (await tokenAsDeployer.transfer(timelockAddr, remaining)).wait();

  const stipendAmount = BigInt(stipendWei || 0n);
  const stipendsSent = [];
  if (stipendAmount > 0n) {
    if (!deployer.provider) {
      throw new Error("deployer.provider is required when stipendWei > 0n");
    }
    for (const [role, addr] of [
      ["voterA", voterAAddr],
      ["voterB", voterBAddr],
      ...(voterCAddr ? [["voterC", voterCAddr]] : []),
      ["guardian", guardianAddr],
    ]) {
      const nativeBal = await deployer.provider.getBalance(addr);
      if (nativeBal < MIN_NATIVE_BALANCE) {
        log(
          logger,
          `Forwarding ${ethers.formatEther(stipendAmount)} native stipend -> ${role} (${addr})`
        );
        await (await deployer.sendTransaction({ to: addr, value: stipendAmount })).wait();
        stipendsSent.push({ role, address: addr, amountWei: stipendAmount });
      }
    }
  }

  const deployerBalance = await token.balanceOf(deployerAddr);
  const deployerVotes = await token.getVotes(deployerAddr);
  if (deployerBalance !== 0n) {
    throw new Error(`Deployer residual token balance must be 0, got ${deployerBalance}`);
  }
  if (deployerVotes !== 0n) {
    throw new Error(`Deployer residual voting power must be 0, got ${deployerVotes}`);
  }

  const voterABalance = await token.balanceOf(voterAAddr);
  const voterBBalance = await token.balanceOf(voterBAddr);
  const timelockBalance = await token.balanceOf(timelockAddr);

  return {
    deployer: deployerAddr,
    voterA: voterAAddr,
    voterB: voterBAddr,
    voterC: voterCAddr,
    voterCBalance: voterCAddr ? await token.balanceOf(voterCAddr) : 0n,
    guardian: guardianAddr,
    timelockAddress: timelockAddr,
    voterABalance,
    voterBBalance,
    timelockBalance,
    deployerBalance,
    deployerVotes,
    stipendsSent,
  };
}

/**
 * Verifies both voterA and voterB have delegated and hold at least minWeight active ERC20Votes
 * BEFORE `propose()` snapshots voting weight (preventing the zero-weight snapshot trap).
 */
async function assertPreProposalDelegation(
  token,
  voterA,
  voterB,
  minWeight = VOTER_ALLOCATION
) {
  if (!token) throw new Error("token contract instance is required");
  const voterAAddr = await resolveAddress("voterA", voterA);
  const voterBAddr = await resolveAddress("voterB", voterB);
  const requiredWeight = BigInt(minWeight);

  for (const [label, addr] of [
    ["voterA", voterAAddr],
    ["voterB", voterBAddr],
  ]) {
    const delegatee = await token.delegates(addr);
    const votes = await token.getVotes(addr);
    if (delegatee === ethers.ZeroAddress || votes < requiredWeight) {
      throw new Error(
        `Pre-proposal delegation check failed for ${label} (${addr}): ` +
          `delegates=${delegatee}, getVotes=${ethers.formatEther(votes)} UTP, ` +
          `required>=${ethers.formatEther(requiredWeight)} UTP. ` +
          `Each voter must call token.delegate() before propose() is submitted.`
      );
    }
  }

  return {
    voterAVotes: await token.getVotes(voterAAddr),
    voterBVotes: await token.getVotes(voterBAddr),
  };
}

async function main() {
  const hre = require("hardhat");
  const network = hre.network.name;
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment manifest not found at ${deploymentPath}. Run scripts/deploy.cjs first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer configured.");
  }

  const token = await hre.ethers.getContractAt("UTPToken", manifest.contracts.UTPToken);
  const defaultStipend = LOCAL_NETWORKS.has(network) ? 0n : DEFAULT_STIPEND_WEI;
  const stipendWei =
    process.env.STIPEND_WEI !== undefined ? BigInt(process.env.STIPEND_WEI) : defaultStipend;

  const result = await distributeAndVerify({
    token,
    deployer,
    voterA: process.env.VOTER_A_ADDRESS,
    voterB: process.env.VOTER_B_ADDRESS,
    voterC: process.env.VOTER_C_ADDRESS || undefined,
    guardian: process.env.GUARDIAN_ADDRESS || manifest.params?.guardian,
    timelockAddress: manifest.contracts.UtPTimelock,
    stipendWei,
    logger: console.log,
  });

  console.log("=== DISTRIBUTION COMPLETE ===");
  console.log(
    JSON.stringify(
      result,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2
    )
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`=== DISTRIBUTION FAILED === ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  distributeAndVerify,
  assertPreProposalDelegation,
  VOTER_ALLOCATION,
  VOTER_C_ALLOCATION,
  EXPECTED_TREASURY_REMAINDER,
  DEFAULT_STIPEND_WEI,
  MIN_NATIVE_BALANCE,
};
