import { expect } from "chai";
import hre from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import core from "../../scripts/lib/deploy-core.cjs";
const { ethers } = hre;
const { deployCore, verifyCore } = core;

// ProposalState enum (OpenZeppelin Governor)
const S = { Pending: 0n, Active: 1n, Canceled: 2n, Defeated: 3n, Succeeded: 4n, Queued: 5n, Expired: 6n, Executed: 7n };
const AGAINST = 0, FOR = 1, ABSTAIN = 2;
const DELAY = 3600;
const VOTING_DELAY = 1;
const VOTING_PERIOD = 20;

describe("GovernancePlugin (OZ Governor + Timelock)", function () {
  let deployer, alice, bob, carol, guardian, recipient, outsider;
  let c; // contracts
  let addrs;

  async function setup(overrides = {}) {
    [deployer, alice, bob, carol, guardian, recipient, outsider] = await ethers.getSigners();
    const deployed = await deployCore(ethers, deployer, {
      initialSupply: ethers.parseEther("1000000"),
      votingDelay: VOTING_DELAY,
      votingPeriod: VOTING_PERIOD,
      proposalThreshold: ethers.parseEther("1000"),
      quorumPercent: 4, // 40,000 UTP
      timelockMinDelay: DELAY,
      guardian: guardian.address,
      ...overrides,
    });
    c = deployed.contracts;
    addrs = deployed.addresses;

    // alice 300k, bob 100k, carol 30k, outsider 500 (below threshold)
    await c.token.transfer(alice.address, ethers.parseEther("300000"));
    await c.token.transfer(bob.address, ethers.parseEther("100000"));
    await c.token.transfer(carol.address, ethers.parseEther("30000"));
    await c.token.transfer(outsider.address, ethers.parseEther("500"));
    for (const s of [alice, bob, carol, outsider]) await c.token.connect(s).delegate(s.address);
    await mine(1);

    // Fund the treasury so proposals have something to move
    await deployer.sendTransaction({ to: addrs.Treasury, value: ethers.parseEther("5") });
    return deployed;
  }

  // Proposal: DAO.execute -> Treasury.withdraw(recipient, 1 RBTC)
  function treasuryProposal(amount = ethers.parseEther("1"), description = "Grant #1: send 1 RBTC to recipient") {
    const withdraw = c.treasury.interface.encodeFunctionData("withdraw", [recipient.address, amount]);
    const daoCall = c.dao.interface.encodeFunctionData("execute", [[addrs.Treasury], [0], [withdraw]]);
    const targets = [addrs.DAO], values = [0], calldatas = [daoCall];
    return { targets, values, calldatas, description, descHash: ethers.id(description) };
  }

  async function propose(signer, prop) {
    await c.governance.connect(signer).propose(prop.targets, prop.values, prop.calldatas, prop.description);
    return c.governance.hashProposal(prop.targets, prop.values, prop.calldatas, prop.descHash);
  }

  describe("Deployment invariants", function () {
    beforeEach(async () => { await setup(); });

    it("passes every post-deploy permission check", async function () {
      const n = await verifyCore({ contracts: c }, deployer.address);
      expect(n).to.be.greaterThan(5);
    });

    it("leaves the deployer unable to execute anything on the DAO", async function () {
      await expect(c.dao.connect(deployer).execute([recipient.address], [0], ["0x"]))
        .to.be.revertedWithCustomError(c.dao, "AccessDenied");
    });

    it("leaves the deployer unable to grant permissions", async function () {
      await expect(c.dao.connect(deployer).grant(addrs.DAO, deployer.address, await c.dao.ROOT_PERMISSION_ID()))
        .to.be.revertedWithCustomError(c.dao, "AccessDenied");
    });

    it("exposes the configured settings", async function () {
      expect(await c.governance.votingDelay()).to.equal(VOTING_DELAY);
      expect(await c.governance.votingPeriod()).to.equal(VOTING_PERIOD);
      expect(await c.governance.proposalThreshold()).to.equal(ethers.parseEther("1000"));
      expect(await c.governance["quorumNumerator()"]()).to.equal(4);
      expect(await c.governance.requireHybridAuth()).to.equal(false);
      expect(await c.timelock.getMinDelay()).to.equal(DELAY);
    });
  });

  describe("Proposal lifecycle", function () {
    beforeEach(async () => { await setup(); });

    it("propose -> vote -> succeed -> queue -> wait -> execute moves treasury funds", async function () {
      const prop = treasuryProposal();
      const id = await propose(alice, prop);
      expect(await c.governance.state(id)).to.equal(S.Pending);

      await mine(VOTING_DELAY + 1);
      expect(await c.governance.state(id)).to.equal(S.Active);
      await c.governance.connect(alice).castVote(id, FOR);
      await c.governance.connect(bob).castVote(id, AGAINST);

      await mine(VOTING_PERIOD);
      expect(await c.governance.state(id)).to.equal(S.Succeeded);

      await c.governance.queue(prop.targets, prop.values, prop.calldatas, prop.descHash);
      expect(await c.governance.state(id)).to.equal(S.Queued);

      // Not executable before the timelock delay
      await expect(c.governance.execute(prop.targets, prop.values, prop.calldatas, prop.descHash)).to.be.reverted;

      await time.increase(DELAY);
      const before = await ethers.provider.getBalance(recipient.address);
      await expect(c.governance.connect(outsider).execute(prop.targets, prop.values, prop.calldatas, prop.descHash))
        .to.emit(c.governance, "ProposalExecuted").withArgs(id);
      expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + ethers.parseEther("1"));
      expect(await c.governance.state(id)).to.equal(S.Executed);
    });

    it("cannot execute twice", async function () {
      const prop = treasuryProposal();
      const id = await propose(alice, prop);
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(alice).castVote(id, FOR);
      await mine(VOTING_PERIOD);
      await c.governance.queue(prop.targets, prop.values, prop.calldatas, prop.descHash);
      await time.increase(DELAY);
      await c.governance.execute(prop.targets, prop.values, prop.calldatas, prop.descHash);
      await expect(c.governance.execute(prop.targets, prop.values, prop.calldatas, prop.descHash))
        .to.be.revertedWithCustomError(c.governance, "GovernorUnexpectedProposalState");
    });

    it("does not execute mid-vote even when quorum is already reached", async function () {
      const prop = treasuryProposal();
      const id = await propose(alice, prop);
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(alice).castVote(id, FOR); // 300k >> 40k quorum
      expect(await c.governance.state(id)).to.equal(S.Active);
      await expect(c.governance.queue(prop.targets, prop.values, prop.calldatas, prop.descHash))
        .to.be.revertedWithCustomError(c.governance, "GovernorUnexpectedProposalState");
    });
  });

  describe("Vote counting", function () {
    beforeEach(async () => { await setup(); });

    it("defeats a proposal when against outweighs for", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(bob).castVote(id, FOR);      // 100k
      await c.governance.connect(alice).castVote(id, AGAINST); // 300k
      await mine(VOTING_PERIOD);
      expect(await c.governance.state(id)).to.equal(S.Defeated);
    });

    it("defeats a proposal that misses quorum", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(carol).castVote(id, FOR); // 30k < 40k quorum
      await mine(VOTING_PERIOD);
      expect(await c.governance.state(id)).to.equal(S.Defeated);
    });

    it("counts abstain toward quorum but not toward the outcome", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(carol).castVote(id, FOR);      // 30k
      await c.governance.connect(bob).castVote(id, ABSTAIN);    // 100k -> quorum met
      await mine(VOTING_PERIOD);
      const [against, forVotes, abstain] = await c.governance.proposalVotes(id);
      expect(forVotes).to.equal(ethers.parseEther("30000"));
      expect(against).to.equal(0n);
      expect(abstain).to.equal(ethers.parseEther("100000"));
      expect(await c.governance.state(id)).to.equal(S.Succeeded);
    });

    it("weights votes by delegated UTP at the snapshot, not current balance", async function () {
      const id = await propose(alice, treasuryProposal());
      const snapshot = await c.governance.proposalSnapshot(id);
      await mine(VOTING_DELAY + 1);
      expect(BigInt(await ethers.provider.getBlockNumber())).to.be.greaterThan(snapshot);
      // bob receives tokens AFTER the snapshot; they must not count
      await c.token.connect(alice).transfer(bob.address, ethers.parseEther("200000"));
      await c.governance.connect(bob).castVote(id, FOR);
      const [, forVotes] = await c.governance.proposalVotes(id);
      expect(forVotes).to.equal(ethers.parseEther("100000"));
    });

    it("rejects a second vote from the same account", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(bob).castVote(id, FOR);
      await expect(c.governance.connect(bob).castVote(id, AGAINST))
        .to.be.revertedWithCustomError(c.governance, "GovernorAlreadyCastVote");
    });
  });

  describe("Voting window", function () {
    beforeEach(async () => { await setup(); });

    it("rejects votes before the voting delay has passed", async function () {
      const id = await propose(alice, treasuryProposal());
      await expect(c.governance.connect(bob).castVote(id, FOR))
        .to.be.revertedWithCustomError(c.governance, "GovernorUnexpectedProposalState");
    });

    it("rejects votes after the voting period ends", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + VOTING_PERIOD + 2);
      await expect(c.governance.connect(bob).castVote(id, FOR))
        .to.be.revertedWithCustomError(c.governance, "GovernorUnexpectedProposalState");
    });
  });

  describe("Proposal threshold", function () {
    beforeEach(async () => { await setup(); });

    it("blocks proposers below the threshold", async function () {
      await expect(propose(outsider, treasuryProposal()))
        .to.be.revertedWithCustomError(c.governance, "GovernorInsufficientProposerVotes");
    });
  });

  describe("Execution path", function () {
    beforeEach(async () => { await setup(); });

    it("routes execution through the timelock (governance itself has no DAO rights)", async function () {
      const EXEC = await c.dao.EXECUTE_PERMISSION_ID();
      expect(await c.dao.hasPermission(addrs.DAO, addrs.GovernancePlugin, EXEC)).to.equal(false);
      expect(await c.governance.timelock()).to.equal(addrs.UtPTimelock);
    });

    it("rejects direct scheduling on the timelock by anyone but governance", async function () {
      const prop = treasuryProposal();
      await expect(
        c.timelock.connect(deployer).scheduleBatch(prop.targets, prop.values, prop.calldatas, ethers.ZeroHash, ethers.ZeroHash, DELAY)
      ).to.be.revertedWithCustomError(c.timelock, "AccessControlUnauthorizedAccount");
    });

    it("lets the guardian cancel a queued operation (emergency veto)", async function () {
      const prop = treasuryProposal();
      const id = await propose(alice, prop);
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(alice).castVote(id, FOR);
      await mine(VOTING_PERIOD);
      const tx = await c.governance.queue(prop.targets, prop.values, prop.calldatas, prop.descHash);
      const rcpt = await tx.wait();
      const scheduled = rcpt.logs
        .map((l) => { try { return c.timelock.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "CallScheduled");
      const opId = scheduled.args.id;
      expect(await c.timelock.isOperationPending(opId)).to.equal(true);
      await c.timelock.connect(guardian).cancel(opId);

      await time.increase(DELAY);
      expect(await c.governance.state(id)).to.equal(S.Canceled);
      await expect(c.governance.execute(prop.targets, prop.values, prop.calldatas, prop.descHash)).to.be.reverted;
    });

    it("does not let the guardian do anything else", async function () {
      await expect(c.timelock.connect(guardian).scheduleBatch([addrs.DAO], [0], ["0x"], ethers.ZeroHash, ethers.ZeroHash, DELAY))
        .to.be.revertedWithCustomError(c.timelock, "AccessControlUnauthorizedAccount");
      await expect(c.dao.connect(guardian).execute([recipient.address], [0], ["0x"]))
        .to.be.revertedWithCustomError(c.dao, "AccessDenied");
    });

    it("can change its own settings only through a passed proposal", async function () {
      await expect(c.governance.connect(deployer).setVotingPeriod(5))
        .to.be.revertedWithCustomError(c.governance, "GovernorOnlyExecutor");

      const desc = "Shorten voting period";
      const data = c.governance.interface.encodeFunctionData("setVotingPeriod", [30]);
      const prop = { targets: [addrs.GovernancePlugin], values: [0], calldatas: [data], description: desc, descHash: ethers.id(desc) };
      const id = await propose(alice, prop);
      await mine(VOTING_DELAY + 1);
      await c.governance.connect(alice).castVote(id, FOR);
      await mine(VOTING_PERIOD);
      await c.governance.queue(prop.targets, prop.values, prop.calldatas, prop.descHash);
      await time.increase(DELAY);
      await c.governance.execute(prop.targets, prop.values, prop.calldatas, prop.descHash);
      expect(await c.governance.votingPeriod()).to.equal(30);
    });
  });

  describe("Hybrid post-quantum mode (optional, off by default)", function () {
    let pq;

    // MockQuantumVerifier accepts a signature equal to the 32-byte digest
    async function hybridSig(id, voter, support) {
      return c.governance.hybridVoteDigest(id, voter, support);
    }

    beforeEach(async () => {
      const Mock = await ethers.getContractFactory("MockQuantumVerifier");
      pq = await Mock.deploy();
      await setup({ pqVerifier: await pq.getAddress(), requireHybridAuth: true });
    });

    it("refuses to deploy with hybrid required but no verifier", async function () {
      const G = await ethers.getContractFactory("GovernancePlugin");
      await expect(
        G.deploy(addrs.UTPToken, addrs.UtPTimelock, { votingDelay: 1, votingPeriod: 5, proposalThreshold: 0, quorumPercent: 4 }, ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(G, "HybridVerifierMissing");
    });

    it("accepts a vote with a valid PQ signature", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      const sig = await hybridSig(id, bob.address, FOR);
      await expect(c.governance.connect(bob).castVoteHybrid(id, FOR, "0x1234", sig))
        .to.emit(c.governance, "VoteCastWithParams");
    });

    it("rejects plain castVote (no downgrade to ECDSA-only)", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      await expect(c.governance.connect(bob).castVote(id, FOR))
        .to.be.revertedWithCustomError(c.governance, "HybridAuthRequired");
    });

    it("rejects an empty PQ signature", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      await expect(c.governance.connect(bob).castVoteHybrid(id, FOR, "0x1234", "0x"))
        .to.be.revertedWithCustomError(c.governance, "InvalidHybridAuth");
    });

    it("rejects a signature made for a different choice (support is bound)", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      const sigForAgainst = await hybridSig(id, bob.address, AGAINST);
      await expect(c.governance.connect(bob).castVoteHybrid(id, FOR, "0x1234", sigForAgainst))
        .to.be.revertedWithCustomError(c.governance, "InvalidHybridAuth");
    });

    it("rejects a signature replayed by a different voter", async function () {
      const id = await propose(alice, treasuryProposal());
      await mine(VOTING_DELAY + 1);
      const bobSig = await hybridSig(id, bob.address, FOR);
      await expect(c.governance.connect(carol).castVoteHybrid(id, FOR, "0x1234", bobSig))
        .to.be.revertedWithCustomError(c.governance, "InvalidHybridAuth");
    });
  });
});
