/**
 * Deploy the UtP governance core.
 *
 *   npx hardhat run scripts/deploy.cjs --network hardhat      # in-process rehearsal
 *   npx hardhat run scripts/deploy.cjs --network localhost    # against `npx hardhat node`
 *   npx hardhat run scripts/deploy.cjs --network rskTestnet   # needs DEPLOYER_PRIVATE_KEY
 *
 * Outputs:
 *   deployments/<network>.json            canonical addresses (read by the app)
 *   deployments/logs/<network>-<ts>.log   full transcript of this run
 *
 * Financial modules (StablecoinController, UBTC, EventMarket) are NOT deployed here;
 * they stay gated until Roadmap Phase 4.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { deployCore, verifyCore } = require("./lib/deploy-core.cjs");
const config = require("./deploy.config.cjs");

const LOCAL = new Set(["hardhat", "localhost"]);

async function main() {
  const network = hre.network.name;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logDir = path.join(__dirname, "..", "deployments", "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `${network}-${ts}.log`);
  const lines = [];
  const log = (m) => { console.log(m); lines.push(m); };
  const flush = () => fs.writeFileSync(logFile, lines.join("\n") + "\n");

  try {
    const params = config[network];
    if (!params) {
      throw new Error(`No deploy config for network "${network}". Mainnet is blocked until the Phase 3 audit gate.`);
    }

    const [deployer] = await hre.ethers.getSigners();
    if (!deployer) throw new Error("No deployer account. Set DEPLOYER_PRIVATE_KEY for non-local networks.");

    // ---- Preflight ----
    const net = await hre.ethers.provider.getNetwork();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    log("=== UtP governance core deployment ===");
    log(`network   ${network} (chainId ${net.chainId})`);
    log(`deployer  ${deployer.address}`);
    log(`balance   ${hre.ethers.formatEther(balance)} native`);
    log(`block     ${await hre.ethers.provider.getBlockNumber()}`);
    log(`params    votingDelay=${params.votingDelay} votingPeriod=${params.votingPeriod} threshold=${hre.ethers.formatEther(params.proposalThreshold)} UTP quorum=${params.quorumPercent}% timelock=${params.timelockMinDelay}s guardian=${params.guardian}`);

    if (BigInt(net.chainId) !== BigInt(params.chainId)) {
      throw new Error(`chainId mismatch: RPC reports ${net.chainId}, config expects ${params.chainId}`);
    }
    if (balance < params.minDeployerBalance) {
      throw new Error(`Deployer balance ${hre.ethers.formatEther(balance)} below minimum ${hre.ethers.formatEther(params.minDeployerBalance)}. Fund it from a testnet faucet.`);
    }
    if (!LOCAL.has(network) && (params.pqVerifier || params.requireHybridAuth)) {
      throw new Error("Hybrid PQ voting has no production verifier yet (decision D1). Refusing to deploy with mocks.");
    }

    // ---- Deploy + wire ----
    const started = Date.now();
    const core = await deployCore(hre.ethers, deployer, params, log);

    // ---- Verify invariants ----
    log("Verifying post-deploy invariants");
    const n = await verifyCore(core, deployer.address, log);
    log(`All ${n} invariants hold. Took ${((Date.now() - started) / 1000).toFixed(1)}s.`);

    // ---- Persist ----
    const out = {
      network,
      chainId: Number(net.chainId),
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      blockNumber: await hre.ethers.provider.getBlockNumber(),
      params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])),
      contracts: core.addresses,
    };
    if (network !== "hardhat") {
      const file = path.join(__dirname, "..", "deployments", `${network}.json`);
      fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
      log(`Wrote ${path.relative(process.cwd(), file)}`);
    }
    log(`Log: ${path.relative(process.cwd(), logFile)}`);
    log("=== DEPLOYMENT OK ===");
  } catch (err) {
    log(`=== DEPLOYMENT FAILED === ${err.message}`);
    flush();
    throw err;
  }
  flush();
}

main().catch(() => { process.exitCode = 1; });
