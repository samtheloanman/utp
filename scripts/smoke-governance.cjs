/**
 * Post-deploy smoke test against a live RPC, using deployments/<network>.json.
 *
 *   npx hardhat run scripts/smoke-governance.cjs --network localhost    # full lifecycle (time travel)
 *   npx hardhat run scripts/smoke-governance.cjs --network rskTestnet   # read-only invariant checks
 *
 * Local: delegate -> propose -> vote -> queue -> wait -> execute a real proposal.
 * Remote: re-verify every permission invariant and print live governance settings.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { verifyCore } = require("./lib/deploy-core.cjs");

const LOCAL = new Set(["hardhat", "localhost"]);

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(file)) throw new Error(`No ${path.relative(process.cwd(), file)}; deploy first.`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const A = dep.contracts;
  const { ethers } = hre;

  const at = (name, addr) => ethers.getContractAt(name, addr);
  const contracts = {
    dao: await at("DAO", A.DAO),
    token: await at("UTPToken", A.UTPToken),
    timelock: await at("UtPTimelock", A.UtPTimelock),
    governance: await at("GovernancePlugin", A.GovernancePlugin),
    treasury: await at("Treasury", A.Treasury),
    registry: await at("PluginRegistry", A.PluginRegistry),
  };
  const g = contracts.governance;

  console.log(`=== Smoke test: ${network} (chainId ${(await ethers.provider.getNetwork()).chainId}) ===`);
  for (const [k, v] of Object.entries(A)) {
    const code = await ethers.provider.getCode(v);
    if (code === "0x") throw new Error(`${k} at ${v} has no code`);
    console.log(`  ✔ ${k.padEnd(17)} ${v} (${(code.length - 2) / 2} bytes)`);
  }
  console.log("Invariants");
  await verifyCore({ contracts }, dep.deployer, console.log);
  console.log("Live settings");
  const clock = await g.clock();
  console.log(`  votingDelay=${await g.votingDelay()} votingPeriod=${await g.votingPeriod()} threshold=${ethers.formatEther(await g.proposalThreshold())} UTP`);
  console.log(`  quorum now=${ethers.formatEther(await g.quorum(clock - 1n))} UTP  timelockDelay=${await contracts.timelock.getMinDelay()}s  hybrid=${await g.requireHybridAuth()}`);

  if (!LOCAL.has(network)) {
    console.log("=== SMOKE OK (read-only on remote network) ===");
    return;
  }

  // ---- Full lifecycle on a local node ----
  const [deployer, voter, recipient] = await ethers.getSigners();
  const mine = async (n) => { for (let i = 0; i < n; i++) await ethers.provider.send("evm_mine", []); };
  const step = (m) => console.log(`  → ${m}`);

  console.log("Lifecycle");
  step("distribute + delegate 1,000,000 UTP to voter");
  await (await contracts.token.connect(deployer).transfer(voter.address, ethers.parseEther("1000000"))).wait();
  await (await contracts.token.connect(voter).delegate(voter.address)).wait();
  await mine(1);

  step("fund treasury with 1 ETH");
  await (await deployer.sendTransaction({ to: A.Treasury, value: ethers.parseEther("1") })).wait();

  const withdraw = contracts.treasury.interface.encodeFunctionData("withdraw", [recipient.address, ethers.parseEther("0.25")]);
  const daoCall = contracts.dao.interface.encodeFunctionData("execute", [[A.Treasury], [0], [withdraw]]);
  const targets = [A.DAO], values = [0], calldatas = [daoCall];
  const description = `Smoke test payout ${Date.now()}`;
  const descHash = ethers.id(description);

  step("propose treasury payout");
  await (await g.connect(voter).propose(targets, values, calldatas, description)).wait();
  const id = await g.hashProposal(targets, values, calldatas, descHash);
  const stateName = async () => ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"][Number(await g.state(id))];
  console.log(`    proposal ${id.toString().slice(0, 12)}… state=${await stateName()}`);

  await mine(Number(await g.votingDelay()) + 1);
  step(`vote FOR (state=${await stateName()})`);
  await (await g.connect(voter).castVote(id, 1)).wait();

  await mine(Number(await g.votingPeriod()));
  step(`queue (state=${await stateName()})`);
  await (await g.queue(targets, values, calldatas, descHash)).wait();

  const delay = Number(await contracts.timelock.getMinDelay());
  step(`wait timelock ${delay}s (state=${await stateName()})`);
  await ethers.provider.send("evm_increaseTime", [delay]);
  await mine(1);

  const before = await ethers.provider.getBalance(recipient.address);
  step("execute");
  await (await g.execute(targets, values, calldatas, descHash)).wait();
  const delta = (await ethers.provider.getBalance(recipient.address)) - before;
  console.log(`    state=${await stateName()}  recipient +${ethers.formatEther(delta)} ETH`);
  if (delta !== ethers.parseEther("0.25")) throw new Error("Payout amount mismatch");
  console.log("=== SMOKE OK (full lifecycle) ===");
}

main().catch((e) => { console.error(`=== SMOKE FAILED === ${e.message}`); process.exitCode = 1; });
