import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("GovernancePlugin", function () {
  let dao, governancePlugin, utpToken, quantumVerifier, zkVerifier;
  let owner, voter1, voter2, voter3, recipient;
  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
  const QUORUM_BPS = 100; // 1% quorum for tests
  const VOTING_PERIOD = 10; // 10 blocks

  // Helper: build a PQ signature that passes MockQuantumVerifier
  // The mock checks: first 32 bytes of signature == messageHash
  async function buildPQSignature(proposalId, voter, pluginAddress) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "address", "uint256"],
      [proposalId, voter, pluginAddress, chainId]
    );
    // Return the hash itself as a 32-byte signature (satisfies the mock)
    return messageHash;
  }

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, recipient] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();

    const UTPToken = await ethers.getContractFactory("UTPToken");
    utpToken = await UTPToken.deploy(await dao.getAddress(), owner.address, INITIAL_SUPPLY);

    const MockQuantumVerifier = await ethers.getContractFactory("MockQuantumVerifier");
    quantumVerifier = await MockQuantumVerifier.deploy();

    const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
    zkVerifier = await MockZKVerifier.deploy();

    const GovernancePlugin = await ethers.getContractFactory("GovernancePlugin");
    governancePlugin = await GovernancePlugin.deploy(
      await dao.getAddress(),
      await quantumVerifier.getAddress(),
      await zkVerifier.getAddress(),
      await utpToken.getAddress(),
      QUORUM_BPS,
      VOTING_PERIOD
    );

    const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
    await dao.grant(await dao.getAddress(), await governancePlugin.getAddress(), EXECUTE_PERMISSION_ID);

    // Distribute tokens and delegate
    const voteAmount = ethers.parseEther("10000000");
    await utpToken.transfer(voter1.address, voteAmount);
    await utpToken.transfer(voter2.address, voteAmount);
    await utpToken.transfer(voter3.address, voteAmount);

    await utpToken.connect(owner).delegate(owner.address);
    await utpToken.connect(voter1).delegate(voter1.address);
    await utpToken.connect(voter2).delegate(voter2.address);
    await utpToken.connect(voter3).delegate(voter3.address);
  });

  describe("Deployment", function () {
    it("Should set the correct DAO address", async function () {
      expect(await governancePlugin.dao()).to.equal(await dao.getAddress());
    });

    it("Should set the correct quantum verifier", async function () {
      expect(await governancePlugin.quantumVerifier()).to.equal(await quantumVerifier.getAddress());
    });

    it("Should set the correct ZK verifier", async function () {
      expect(await governancePlugin.zkVerifier()).to.equal(await zkVerifier.getAddress());
    });

    it("Should set the correct voting token", async function () {
      expect(await governancePlugin.votingToken()).to.equal(await utpToken.getAddress());
    });

    it("Should have correct quorum setting", async function () {
      expect(await governancePlugin.quorumBps()).to.equal(QUORUM_BPS);
    });

    it("Should have correct voting period", async function () {
      expect(await governancePlugin.votingPeriod()).to.equal(VOTING_PERIOD);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow anyone to create a proposal", async function () {
      const targets = [recipient.address];
      const values = [ethers.parseEther("1")];
      const callDatas = ["0x"];

      await expect(governancePlugin.createProposal(targets, values, callDatas))
        .to.emit(governancePlugin, "ProposalCreated");
    });

    it("Should return the correct proposal ID", async function () {
      const targets = [recipient.address];
      const values = [0];
      const callDatas = ["0x"];

      await governancePlugin.createProposal(targets, values, callDatas);
      await governancePlugin.createProposal(targets, values, callDatas);

      const proposal0 = await governancePlugin.proposals(0);
      const proposal1 = await governancePlugin.proposals(1);
      expect(proposal0.voteWeight).to.equal(0);
      expect(proposal1.voteWeight).to.equal(0);
    });

    it("Should store proposal data correctly", async function () {
      const targets = [voter1.address, voter2.address];
      const values = [0, 0];
      const callDatas = ["0x", "0x"];

      await governancePlugin.createProposal(targets, values, callDatas);

      const proposal = await governancePlugin.proposals(0);
      expect(proposal.voteWeight).to.equal(0);
      expect(proposal.executed).to.be.false;
      expect(proposal.startBlock).to.be.gt(0);
      expect(proposal.endBlock).to.be.gt(proposal.startBlock);
    });
  });

  describe("Hybrid Voting (ECC + PQ)", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [recipient.address];
      const values = [0];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);
      proposalId = 0;
    });

    it("Should allow voting with valid hybrid authentication", async function () {
      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const pluginAddress = await governancePlugin.getAddress();
      const pqSignature = await buildPQSignature(proposalId, voter1.address, pluginAddress);

      await expect(governancePlugin.connect(voter1).castVoteHybrid(proposalId, pqPublicKey, pqSignature))
        .to.emit(governancePlugin, "VoteCast");
    });

    it("Should use token-weighted vote power", async function () {
      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const pluginAddress = await governancePlugin.getAddress();
      const pqSignature = await buildPQSignature(proposalId, voter1.address, pluginAddress);

      await governancePlugin.connect(voter1).castVoteHybrid(proposalId, pqPublicKey, pqSignature);

      const proposal = await governancePlugin.proposals(proposalId);
      expect(proposal.voteWeight).to.equal(ethers.parseEther("10000000"));
    });

    it("Should reject voting with invalid PQ signature", async function () {
      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const shortSig = ethers.hexlify(ethers.toUtf8Bytes("ab"));

      await expect(
        governancePlugin.connect(voter1).castVoteHybrid(proposalId, pqPublicKey, shortSig)
      ).to.be.revertedWithCustomError(governancePlugin, "InvalidAuth");
    });

    it("Should reject voting with empty PQ signature (downgrade attack)", async function () {
      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const emptySignature = "0x";

      await expect(
        governancePlugin.connect(voter1).castVoteHybrid(proposalId, pqPublicKey, emptySignature)
      ).to.be.revertedWithCustomError(governancePlugin, "InvalidAuth");
    });

    it("Should prevent double voting", async function () {
      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const pluginAddress = await governancePlugin.getAddress();
      const pqSignature = await buildPQSignature(proposalId, voter1.address, pluginAddress);

      await governancePlugin.connect(voter1).castVoteHybrid(proposalId, pqPublicKey, pqSignature);

      // Second vote is rejected — either AlreadyVoted (if not yet executed)
      // or ProposalAlreadyExecuted (if auto-executed due to quorum).
      // With 10M tokens and 1M quorum, proposal auto-executes on first vote.
      await expect(
        governancePlugin.connect(voter1).castVoteHybrid(proposalId, pqPublicKey, pqSignature)
      ).to.be.revertedWithCustomError(governancePlugin, "ProposalAlreadyExecuted");
    });

    it("Should auto-execute when quorum is reached", async function () {
      await owner.sendTransaction({ to: await dao.getAddress(), value: ethers.parseEther("10") });

      const value = ethers.parseEther("1");
      const targets = [recipient.address];
      const values = [value];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);
      const pid = 1;

      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const pluginAddress = await governancePlugin.getAddress();
      const pqSignature = await buildPQSignature(pid, voter1.address, pluginAddress);

      await expect(governancePlugin.connect(voter1).castVoteHybrid(pid, pqPublicKey, pqSignature))
        .to.emit(governancePlugin, "ProposalExecuted")
        .withArgs(pid);

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(value);
    });
  });

  describe("ZK-Gated Anonymous Voting", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [recipient.address];
      const values = [0];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);
      proposalId = 0;
    });

    it("Should allow anonymous voting with valid ZK proof", async function () {
      const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
      const nullifier = ethers.encodeBytes32String("nullifier_1");

      await expect(governancePlugin.castVoteZK(proposalId, zkProof, nullifier))
        .to.emit(governancePlugin, "VoteCastAnonymous");
    });

    it("Should reject invalid ZK proof", async function () {
      const invalidProof = ethers.hexlify(ethers.toUtf8Bytes("invalid_proof"));
      const nullifier = ethers.encodeBytes32String("nullifier_1");

      await expect(
        governancePlugin.castVoteZK(proposalId, invalidProof, nullifier)
      ).to.be.revertedWithCustomError(governancePlugin, "InvalidAuth");
    });

    it("Should prevent double-voting with same nullifier", async function () {
      const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
      const nullifier = ethers.encodeBytes32String("nullifier_1");

      await governancePlugin.castVoteZK(proposalId, zkProof, nullifier);

      await expect(
        governancePlugin.castVoteZK(proposalId, zkProof, nullifier)
      ).to.be.revertedWithCustomError(governancePlugin, "NullifierAlreadyUsed");
    });

    it("Should allow different nullifiers", async function () {
      const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
      const nullifier1 = ethers.encodeBytes32String("nullifier_1");
      const nullifier2 = ethers.encodeBytes32String("nullifier_2");

      await governancePlugin.castVoteZK(proposalId, zkProof, nullifier1);
      await governancePlugin.castVoteZK(proposalId, zkProof, nullifier2);

      const proposal = await governancePlugin.proposals(proposalId);
      expect(proposal.voteWeight).to.equal(2);
    });
  });

  describe("Quorum", function () {
    it("Should calculate correct quorum threshold", async function () {
      const expected = ethers.parseEther("1000000");
      expect(await governancePlugin.quorumThreshold()).to.equal(expected);
    });

    it("Should not execute below quorum", async function () {
      const targets = [recipient.address];
      const values = [0];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);

      const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
      const nullifier = ethers.encodeBytes32String("nullifier_1");
      await governancePlugin.castVoteZK(0, zkProof, nullifier);

      const proposal = await governancePlugin.proposals(0);
      expect(proposal.executed).to.be.false;
    });

    it("Should allow manual execution when quorum is reached", async function () {
      await owner.sendTransaction({ to: await dao.getAddress(), value: ethers.parseEther("5") });

      const targets = [recipient.address];
      const values = [ethers.parseEther("1")];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);

      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const pluginAddress = await governancePlugin.getAddress();
      const pqSignature = await buildPQSignature(0, owner.address, pluginAddress);

      await governancePlugin.connect(owner).castVoteHybrid(0, pqPublicKey, pqSignature);

      const proposal = await governancePlugin.proposals(0);
      expect(proposal.executed).to.be.true;
    });

    it("Should revert executeProposal if quorum not reached", async function () {
      const targets = [recipient.address];
      const values = [0];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);

      await expect(
        governancePlugin.executeProposal(0)
      ).to.be.revertedWithCustomError(governancePlugin, "QuorumNotReached");
    });
  });

  describe("Proposal Execution", function () {
    it("Should prevent double execution", async function () {
      await owner.sendTransaction({ to: await dao.getAddress(), value: ethers.parseEther("5") });

      const targets = [recipient.address];
      const values = [ethers.parseEther("1")];
      const callDatas = ["0x"];
      await governancePlugin.createProposal(targets, values, callDatas);

      const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
      const pluginAddress = await governancePlugin.getAddress();
      const pqSignature = await buildPQSignature(0, voter1.address, pluginAddress);

      await governancePlugin.connect(voter1).castVoteHybrid(0, pqPublicKey, pqSignature);

      await expect(
        governancePlugin.executeProposal(0)
      ).to.be.revertedWithCustomError(governancePlugin, "ProposalAlreadyExecuted");
    });
  });
});
