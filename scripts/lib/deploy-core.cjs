/**
 * Governance-core deployment, shared by scripts/deploy.cjs and the test suite
 * so tests exercise exactly the wiring that ships.
 *
 * Deploys: DAO, UTPToken, UtPTimelock, GovernancePlugin, Treasury, PluginRegistry.
 * Final permission state (verified by verifyCore):
 *   - Timelock holds ROOT on the DAO and is the only executor of DAO actions.
 *   - GovernancePlugin is the timelock's only proposer (+ canceller); it holds no DAO permissions.
 *   - Timelock administers itself (no external admin).
 *   - Deployer holds no ROOT and no timelock admin.
 *   - Optional guardian may CANCEL queued operations (emergency veto), nothing else.
 *   - PluginRegistry holds only UNINSTALL_PLUGIN_PERMISSION.
 */

const ZERO = "0x0000000000000000000000000000000000000000";

function log(logger, msg) {
  if (logger) logger(msg);
}

async function deployCore(ethers, deployer, params, logger) {
  const p = {
    initialHolder: deployer.address,
    initialSupply: ethers.parseEther("10000000"),
    votingDelay: 1,
    votingPeriod: 50,
    proposalThreshold: 0n,
    quorumPercent: 4,
    timelockMinDelay: 3600,
    guardian: ZERO,
    pqVerifier: ZERO,
    requireHybridAuth: false,
    ...params,
  };

  const deployed = {};
  const deploy = async (name, args) => {
    const F = await ethers.getContractFactory(name, deployer);
    const c = await F.deploy(...args);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    const rcpt = await c.deploymentTransaction().wait();
    deployed[name] = addr;
    log(logger, `  ${name.padEnd(17)} ${addr}  (gas ${rcpt.gasUsed})`);
    return c;
  };
  const send = async (label, txPromise) => {
    const tx = await txPromise;
    const rcpt = await tx.wait();
    log(logger, `  ✔ ${label}  (gas ${rcpt.gasUsed})`);
    return rcpt;
  };

  log(logger, "Deploying contracts");
  const dao = await deploy("DAO", []);
  const daoAddr = await dao.getAddress();
  const token = await deploy("UTPToken", [daoAddr, p.initialHolder, p.initialSupply]);
  // admin = deployer only during setup; renounced below
  const timelock = await deploy("UtPTimelock", [p.timelockMinDelay, [], [ZERO], deployer.address]);
  const governance = await deploy("GovernancePlugin", [
    await token.getAddress(),
    await timelock.getAddress(),
    {
      votingDelay: p.votingDelay,
      votingPeriod: p.votingPeriod,
      proposalThreshold: p.proposalThreshold,
      quorumPercent: p.quorumPercent,
    },
    p.pqVerifier,
    p.requireHybridAuth,
  ]);
  const treasury = await deploy("Treasury", [daoAddr]);
  const registry = await deploy("PluginRegistry", [daoAddr]);

  const tlAddr = await timelock.getAddress();
  const govAddr = await governance.getAddress();
  const PROPOSER = await timelock.PROPOSER_ROLE();
  const CANCELLER = await timelock.CANCELLER_ROLE();
  const TL_ADMIN = await timelock.DEFAULT_ADMIN_ROLE();
  const ROOT = await dao.ROOT_PERMISSION_ID();
  const UNINSTALL = await dao.UNINSTALL_PLUGIN_PERMISSION_ID();

  log(logger, "Wiring permissions");
  await send("timelock: governance = proposer", timelock.grantRole(PROPOSER, govAddr));
  await send("timelock: governance = canceller", timelock.grantRole(CANCELLER, govAddr));
  if (p.guardian !== ZERO) {
    await send(`timelock: guardian ${p.guardian} = canceller`, timelock.grantRole(CANCELLER, p.guardian));
  }
  await send("dao: timelock = ROOT", dao.grant(daoAddr, tlAddr, ROOT));
  await send("dao: registry = UNINSTALL_PLUGIN", dao.grant(daoAddr, await registry.getAddress(), UNINSTALL));
  await send("registry: install governance plugin", registry.installPlugin(govAddr));

  log(logger, "Removing deployer privileges");
  await send("dao: revoke deployer ROOT", dao.revoke(daoAddr, deployer.address, ROOT));
  await send("timelock: deployer renounces admin", timelock.renounceRole(TL_ADMIN, deployer.address));

  return {
    addresses: deployed,
    params: p,
    contracts: { dao, token, timelock, governance, treasury, registry },
  };
}

/** Asserts the post-deploy permission invariants. Throws on any violation. */
async function verifyCore(core, deployerAddress, logger) {
  const { dao, timelock, governance, registry } = core.contracts;
  const daoAddr = await dao.getAddress();
  const tlAddr = await timelock.getAddress();
  const govAddr = await governance.getAddress();
  const regAddr = await registry.getAddress();
  const ROOT = await dao.ROOT_PERMISSION_ID();
  const EXEC = await dao.EXECUTE_PERMISSION_ID();
  const TL_ADMIN = await timelock.DEFAULT_ADMIN_ROLE();

  const checks = [
    ["timelock holds DAO ROOT", await dao.hasPermission(daoAddr, tlAddr, ROOT), true],
    ["deployer has no DAO ROOT", await dao.hasPermission(daoAddr, deployerAddress, ROOT), false],
    ["deployer cannot execute on DAO", await dao.hasPermission(daoAddr, deployerAddress, EXEC), false],
    ["governance cannot execute on DAO directly", await dao.hasPermission(daoAddr, govAddr, EXEC), false],
    ["registry has no DAO ROOT", await dao.hasPermission(daoAddr, regAddr, ROOT), false],
    ["timelock is self-administered", await timelock.hasRole(TL_ADMIN, tlAddr), true],
    ["deployer has no timelock admin", await timelock.hasRole(TL_ADMIN, deployerAddress), false],
    ["governance is timelock proposer", await timelock.hasRole(await timelock.PROPOSER_ROLE(), govAddr), true],
    ["deployer is not timelock proposer", await timelock.hasRole(await timelock.PROPOSER_ROLE(), deployerAddress), false],
    ["governance points at timelock", (await governance.timelock()).toLowerCase(), tlAddr.toLowerCase()],
    ["governance plugin installed", (await registry.plugins(govAddr)).active, true],
  ];

  let failed = 0;
  for (const [label, actual, expected] of checks) {
    const ok = actual === expected;
    if (!ok) failed++;
    log(logger, `  ${ok ? "✔" : "✘"} ${label}${ok ? "" : ` (got ${actual}, want ${expected})`}`);
  }
  if (failed) throw new Error(`${failed} post-deploy invariant(s) failed`);
  return checks.length;
}

module.exports = { deployCore, verifyCore, ZERO };
