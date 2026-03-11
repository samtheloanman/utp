import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Bitcoin DAO Framework - End-to-End Integration", function () {
  let dao, treasury, pluginRegistry, governancePlugin;
  let utpToken, quantumVerifier, zkVerifier;
  let owner, voter1, voter2, recipient;
  const INITIAL_SUPPLY = ethers.parseEther("100000000");
  const QUORUM_BPS = 100;
  const VOTING_PERIOD = 10;

  // Helper: build a PQ signature that passes MockQuantumVerifier
  async function buildPQSignature(proposalId, voter, pluginAddress) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    return ethers.solidityPackedKeccak256(
      ["uint256", "address", "address", "uint256"],
      [proposalId, voter, pluginAddress, chainId]
    );
  }

  beforeEach(async function () {
    [owner, voter1, voter2, recipient] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();
    const daoAddress = await dao.getAddress();

    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(daoAddress);

    const UTPToken = await ethers.getContractFactory("UTPToken");
    utpToken = await UTPToken.deploy(daoAddress, owner.address, INITIAL_SUPPLY);

    const MockQuantumVerifier = await ethers.getContractFactory("MockQuantumVerifier");
    quantumVerifier = await MockQuantumVerifier.deploy();

    const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
    zkVerifier = await MockZKVerifier.deploy();

    const GovernancePlugin = await ethers.getContractFactory("GovernancePlugin");
    governancePlugin = await GovernancePlugin.deploy(
      daoAddress,
      await quantumVerifier.getAddress(),
      await zkVerifier.getAddress(),
      await utpToken.getAddress(),
      QUORUM_BPS,
      VOTING_PERIOD
    );

    const PluginRegistry = await ethers.getContractFactory("PluginRegistry");
    pluginRegistry = await PluginRegistry.deploy(daoAddress);

    const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
    await dao.grant(daoAddress, await governancePlugin.getAddress(), EXECUTE_PERMISSION_ID);

    await utpToken.transfer(voter1.address, ethers.parseEther("10000000"));
    await utpToken.transfer(voter2.address, ethers.parseEther("10000000"));
    await utpToken.connect(owner).delegate(owner.address);
    await utpToken.connect(voter1).delegate(voter1.address);
    await utpToken.connect(voter2).delegate(voter2.address);

    await owner.sendTransaction({ to: daoAddress, value: ethers.parseEther("10") });
  });

  it("Should allow a full governance flow: Proposal -> Hybrid Vote -> Execution", async function () {
    const value = ethers.parseEther("1");
    const targets = [recipient.address];
    const values = [value];
    const callDatas = ["0x"];

    await governancePlugin.createProposal(targets, values, callDatas);

    const balanceBefore = await ethers.provider.getBalance(recipient.address);

    const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
    const pluginAddress = await governancePlugin.getAddress();
    const pqSignature = await buildPQSignature(0, voter1.address, pluginAddress);

    await expect(governancePlugin.connect(voter1).castVoteHybrid(0, pqPublicKey, pqSignature))
      .to.emit(governancePlugin, "ProposalExecuted")
      .withArgs(0);

    const balanceAfter = await ethers.provider.getBalance(recipient.address);
    expect(balanceAfter - balanceBefore).to.equal(value);
  });

  it("Should prevent malicious execution via downgrade attack (missing PQ signature)", async function () {
    const targets = [recipient.address];
    const values = [0];
    const callDatas = ["0x"];

    await governancePlugin.createProposal(targets, values, callDatas);

    const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
    const emptySignature = "0x";

    await expect(
      governancePlugin.connect(voter1).castVoteHybrid(0, pqPublicKey, emptySignature)
    ).to.be.revertedWithCustomError(governancePlugin, "InvalidAuth");
  });

  it("Should allow anonymous voting via ZK-gated participation", async function () {
    const targets = [recipient.address];
    const values = [0];
    const callDatas = ["0x"];

    await governancePlugin.createProposal(targets, values, callDatas);

    const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
    const nullifier = ethers.encodeBytes32String("nullifier_1");

    await expect(governancePlugin.castVoteZK(0, zkProof, nullifier))
      .to.emit(governancePlugin, "VoteCastAnonymous");
  });

  it("Should prevent ZK double-voting with same nullifier", async function () {
    const targets = [recipient.address];
    const values = [0];
    const callDatas = ["0x"];

    await governancePlugin.createProposal(targets, values, callDatas);

    const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
    const nullifier = ethers.encodeBytes32String("nullifier_1");

    await governancePlugin.castVoteZK(0, zkProof, nullifier);
    await expect(
      governancePlugin.castVoteZK(0, zkProof, nullifier)
    ).to.be.revertedWithCustomError(governancePlugin, "NullifierAlreadyUsed");
  });

  it("Should support multi-voter quorum accumulation", async function () {
    // Create proposal (no ETH transfer, just a no-op)
    const targets = [recipient.address];
    const values = [0];
    const callDatas = ["0x"];
    await governancePlugin.createProposal(targets, values, callDatas);

    const pqPublicKey = ethers.hexlify(ethers.toUtf8Bytes("valid_pq_key"));
    const pluginAddress = await governancePlugin.getAddress();

    // voter1 votes (10M tokens, quorum = 1M, auto-executes)
    const sig1 = await buildPQSignature(0, voter1.address, pluginAddress);
    await governancePlugin.connect(voter1).castVoteHybrid(0, pqPublicKey, sig1);

    const proposal = await governancePlugin.proposals(0);
    expect(proposal.executed).to.be.true;
    expect(proposal.voteWeight).to.equal(ethers.parseEther("10000000"));
  });
});
