/**
 * UTP Full Stack Deployment Script
 * Deploys all contracts in dependency order, wires permissions, logs addresses.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network rskTestnet
 *   npx hardhat run scripts/deploy.js --network hardhat  (local test)
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;

    console.log("=".repeat(60));
    console.log("UTP Deployment Script");
    console.log("=".repeat(60));
    console.log(`Network:  ${network}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} RBTC`);
    console.log("=".repeat(60));

    const deployed = {};

    // ---- Step 1: DAO Kernel ----
    console.log("\n[1/9] Deploying DAO...");
    const DAO = await hre.ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();
    deployed.DAO = await dao.getAddress();
    console.log(`  DAO: ${deployed.DAO}`);

    // ---- Step 2: Treasury ----
    console.log("\n[2/9] Deploying Treasury...");
    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(deployed.DAO);
    await treasury.waitForDeployment();
    deployed.Treasury = await treasury.getAddress();
    console.log(`  Treasury: ${deployed.Treasury}`);

    // ---- Step 3: UTP Token ----
    console.log("\n[3/9] Deploying UTP Token...");
    const INITIAL_SUPPLY = hre.ethers.parseEther("100000000"); // 100M initial
    const UTPToken = await hre.ethers.getContractFactory("UTPToken");
    const utpToken = await UTPToken.deploy(deployed.DAO, deployer.address, INITIAL_SUPPLY);
    await utpToken.waitForDeployment();
    deployed.UTPToken = await utpToken.getAddress();
    console.log(`  UTPToken: ${deployed.UTPToken}`);

    // ---- Step 4: Verifiers ----
    console.log("\n[4/9] Deploying Verifiers...");
    const ZKNOX_ethdilithium = await hre.ethers.getContractFactory("ZKNOX_ethdilithium");
    const quantumVerifier = await ZKNOX_ethdilithium.deploy();
    await quantumVerifier.waitForDeployment();
    deployed.QuantumVerifier = await quantumVerifier.getAddress();

    const MockZKVerifier = await hre.ethers.getContractFactory("MockZKVerifier");
    const zkVerifier = await MockZKVerifier.deploy();
    await zkVerifier.waitForDeployment();
    deployed.ZKVerifier = await zkVerifier.getAddress();
    console.log(`  QuantumVerifier: ${deployed.QuantumVerifier}`);
    console.log(`  ZKVerifier: ${deployed.ZKVerifier}`);

    // ---- Step 5: GovernancePlugin ----
    console.log("\n[5/9] Deploying GovernancePlugin...");
    const QUORUM_BPS = 400;    // 4%
    const VOTING_PERIOD = 100; // ~100 blocks (~8 minutes on RSK)
    const GovernancePlugin = await hre.ethers.getContractFactory("GovernancePlugin");
    const governance = await GovernancePlugin.deploy(
        deployed.DAO,
        deployed.QuantumVerifier,
        deployed.ZKVerifier,
        deployed.UTPToken,
        QUORUM_BPS,
        VOTING_PERIOD
    );
    await governance.waitForDeployment();
    deployed.GovernancePlugin = await governance.getAddress();
    console.log(`  GovernancePlugin: ${deployed.GovernancePlugin}`);

    // ---- Step 6: EventMarket ----
    console.log("\n[6/9] Deploying EventMarket...");
    const EventMarket = await hre.ethers.getContractFactory("EventMarket");
    const eventMarket = await EventMarket.deploy(deployed.DAO, deployed.UTPToken);
    await eventMarket.waitForDeployment();
    deployed.EventMarket = await eventMarket.getAddress();
    console.log(`  EventMarket: ${deployed.EventMarket}`);

    // ---- Step 7: UBTC Stablecoin ----
    console.log("\n[7/9] Deploying UBTC...");
    const UBTC = await hre.ethers.getContractFactory("UBTC");
    const ubtc = await UBTC.deploy();
    await ubtc.waitForDeployment();
    deployed.UBTC = await ubtc.getAddress();
    console.log(`  UBTC: ${deployed.UBTC}`);

    // ---- Step 8: StablecoinController ----
    console.log("\n[8/9] Deploying StablecoinController...");
    const MockPriceOracle = await hre.ethers.getContractFactory("MockPriceOracle");
    const oracle = await MockPriceOracle.deploy();
    await oracle.waitForDeployment();
    deployed.PriceOracle = await oracle.getAddress();

    const StablecoinController = await hre.ethers.getContractFactory("StablecoinController");
    const stablecoinController = await StablecoinController.deploy(
        deployed.DAO,
        deployed.UBTC,
        deployed.PriceOracle
    );
    await stablecoinController.waitForDeployment();
    deployed.StablecoinController = await stablecoinController.getAddress();
    console.log(`  PriceOracle: ${deployed.PriceOracle}`);
    console.log(`  StablecoinController: ${deployed.StablecoinController}`);

    // Wire UBTC → StablecoinController
    await ubtc.setController(deployed.StablecoinController);
    console.log("  ✔ UBTC controller set");

    // ---- Step 9: Wire Permissions ----
    console.log("\n[9/9] Wiring permissions...");

    // GovernancePlugin gets EXECUTE_PERMISSION
    const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
    await dao.grant(deployed.DAO, deployed.GovernancePlugin, EXECUTE_PERMISSION_ID);
    console.log("  ✔ GovernancePlugin → EXECUTE_PERMISSION");

    // PluginRegistry
    console.log("  Deploying PluginRegistry...");
    const PluginRegistry = await hre.ethers.getContractFactory("PluginRegistry");
    const pluginRegistry = await PluginRegistry.deploy(deployed.DAO);
    await pluginRegistry.waitForDeployment();
    deployed.PluginRegistry = await pluginRegistry.getAddress();
    console.log(`  PluginRegistry: ${deployed.PluginRegistry}`);

    // EventMarket permissions (deployer gets CREATE + RESOLVE)
    const CREATE_EVENT_PERM = await eventMarket.CREATE_EVENT_PERMISSION_ID();
    const RESOLVE_EVENT_PERM = await eventMarket.RESOLVE_EVENT_PERMISSION_ID();
    await dao.grant(deployed.EventMarket, deployer.address, CREATE_EVENT_PERM);
    await dao.grant(deployed.EventMarket, deployer.address, RESOLVE_EVENT_PERM);
    console.log("  ✔ Deployer → CREATE_EVENT + RESOLVE_EVENT");

    // UTPToken MINTER_PERMISSION to deployer (for initial distribution)
    const MINTER_PERMISSION_ID = await utpToken.MINTER_PERMISSION_ID();
    await dao.grant(deployed.UTPToken, deployer.address, MINTER_PERMISSION_ID);
    console.log("  ✔ Deployer → MINTER_PERMISSION");

    // ---- Step 10: Timelock ----
    console.log("\n[10/10] Deploying Timelock and transferring ownership...");
    const TimelockController = await hre.ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.deploy(deployer.address, deployer.address, deployer.address);
    await timelock.waitForDeployment();
    const timelockAddr = await timelock.getAddress();
    deployed.TimelockController = timelockAddr;
    console.log(`  TimelockController: ${timelockAddr}`);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    await timelock.grantRole(PROPOSER_ROLE, deployed.GovernancePlugin);
    console.log(`  ✔ Granted PROPOSER_ROLE to GovernancePlugin`);

    const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
    await timelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address);
    console.log("  ✔ Renounced TIMELOCK_ADMIN_ROLE from deployer");

    const ROOT_PERMISSION_ID = await dao.ROOT_PERMISSION_ID();
    await dao.grant(deployed.DAO, timelockAddr, ROOT_PERMISSION_ID);
    await dao.revoke(deployed.DAO, deployer.address, ROOT_PERMISSION_ID);
    console.log(`  ✔ Transferred DAO ROOT ownership to TimelockController`);

    // ---- Save Deployment Record ----
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));

    const record = {
        network,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployed,
    };

    console.log(JSON.stringify(record, null, 2));

    // Save to file
    const filename = `deployments/${network}-${Date.now()}.json`;
    fs.mkdirSync("deployments", { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(record, null, 2));
    console.log(`\nSaved to ${filename}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
