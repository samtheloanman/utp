import { expect } from "chai";
import hre from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import core from "../../scripts/lib/deploy-core.cjs";
const { ethers } = hre;
const { deployCore } = core;

const FOR = 1, AGAINST = 0;

describe("UtP DAO - end-to-end on the shipped deploy wiring", function () {
  let deployer, alice, bob, recipient;
  let c, a, params;

  beforeEach(async function () {
    [deployer, alice, bob, recipient] = await ethers.getSigners();
    const d = await deployCore(ethers, deployer, {
      initialSupply: ethers.parseEther("1000000"),
      votingDelay: 1,
      votingPeriod: 10,
      proposalThreshold: ethers.parseEther("100"),
      quorumPercent: 4,
      timelockMinDelay: 3600,
    });
    c = d.contracts; a = d.addresses; params = d.params;
    await c.token.transfer(alice.address, ethers.parseEther("400000"));
    await c.token.transfer(bob.address, ethers.parseEther("100000"));
    await c.token.connect(alice).delegate(alice.address);
    await c.token.connect(bob).delegate(bob.address);
    await mine(1);
  });

  async function pass(targets, values, calldatas, description) {
    const descHash = ethers.id(description);
    await c.governance.connect(alice).propose(targets, values, calldatas, description);
    const id = await c.governance.hashProposal(targets, values, calldatas, descHash);
    await mine(params.votingDelay + 1);
    await c.governance.connect(alice).castVote(id, FOR);
    await mine(params.votingPeriod);
    await c.governance.queue(targets, values, calldatas, descHash);
    await time.increase(params.timelockMinDelay);
    await c.governance.execute(targets, values, calldatas, descHash);
    return id;
  }

  const viaDao = (target, data) => c.dao.interface.encodeFunctionData("execute", [[target], [0], [data]]);

  it("mints UTP only through a passed proposal", async function () {
    const mint = c.token.interface.encodeFunctionData("mint", [recipient.address, ethers.parseEther("123")]);
    await expect(c.token.connect(deployer).mint(recipient.address, 1)).to.be.reverted;
    await pass([a.UTPToken], [0], [mint], "Mint 123 UTP to recipient");
    expect(await c.token.balanceOf(recipient.address)).to.equal(ethers.parseEther("123"));
  });

  it("pays from the treasury through DAO.execute after the timelock", async function () {
    await deployer.sendTransaction({ to: a.Treasury, value: ethers.parseEther("2") });
    const w = c.treasury.interface.encodeFunctionData("withdraw", [recipient.address, ethers.parseEther("0.5")]);
    const before = await ethers.provider.getBalance(recipient.address);
    await pass([a.DAO], [0], [viaDao(a.Treasury, w)], "Treasury payout 0.5 RBTC");
    expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + ethers.parseEther("0.5"));
  });

  it("pauses the treasury by vote, which then blocks withdrawals", async function () {
    await deployer.sendTransaction({ to: a.Treasury, value: ethers.parseEther("1") });
    const pause = c.treasury.interface.encodeFunctionData("setPaused", [true]);
    await pass([a.DAO], [0], [viaDao(a.Treasury, pause)], "Pause treasury");
    expect(await c.treasury.paused()).to.equal(true);

    const w = c.treasury.interface.encodeFunctionData("withdraw", [recipient.address, 1n]);
    const desc = "Withdraw while paused";
    const targets = [a.DAO], calldatas = [viaDao(a.Treasury, w)];
    await c.governance.connect(alice).propose(targets, [0], calldatas, desc);
    const id = await c.governance.hashProposal(targets, [0], calldatas, ethers.id(desc));
    await mine(params.votingDelay + 1);
    await c.governance.connect(alice).castVote(id, FOR);
    await mine(params.votingPeriod);
    await c.governance.queue(targets, [0], calldatas, ethers.id(desc));
    await time.increase(params.timelockMinDelay);
    await expect(c.governance.execute(targets, [0], calldatas, ethers.id(desc))).to.be.reverted;
  });

  it("uninstalls a plugin by vote and strips its execute rights", async function () {
    const EXEC = await c.dao.EXECUTE_PERMISSION_ID();
    const grant = c.dao.interface.encodeFunctionData("grant", [a.DAO, bob.address, EXEC]);
    const install = c.registry.interface.encodeFunctionData("installPlugin", [bob.address]);
    await pass([a.DAO, a.PluginRegistry], [0, 0], [grant, install], "Install plugin bob");
    expect(await c.dao.hasPermission(a.DAO, bob.address, EXEC)).to.equal(true);

    const uninstall = c.registry.interface.encodeFunctionData("uninstallPlugin", [bob.address]);
    await pass([a.PluginRegistry], [0], [uninstall], "Uninstall plugin bob");
    expect(await c.dao.hasPermission(a.DAO, bob.address, EXEC)).to.equal(false);
    expect((await c.registry.plugins(bob.address)).active).to.equal(false);
  });

  it("a defeated proposal can never move funds", async function () {
    await deployer.sendTransaction({ to: a.Treasury, value: ethers.parseEther("1") });
    const w = c.treasury.interface.encodeFunctionData("withdraw", [recipient.address, ethers.parseEther("1")]);
    const desc = "Contested payout";
    const targets = [a.DAO], calldatas = [viaDao(a.Treasury, w)];
    await c.governance.connect(bob).propose(targets, [0], calldatas, desc);
    const id = await c.governance.hashProposal(targets, [0], calldatas, ethers.id(desc));
    await mine(params.votingDelay + 1);
    await c.governance.connect(bob).castVote(id, FOR);
    await c.governance.connect(alice).castVote(id, AGAINST);
    await mine(params.votingPeriod);
    await expect(c.governance.queue(targets, [0], calldatas, ethers.id(desc)))
      .to.be.revertedWithCustomError(c.governance, "GovernorUnexpectedProposalState");
    expect(await ethers.provider.getBalance(a.Treasury)).to.equal(ethers.parseEther("1"));
  });
});
