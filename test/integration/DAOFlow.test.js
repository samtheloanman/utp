import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Bitcoin DAO Framework - End-to-End Integration", function () {
  let dao, governancePlugin, treasury;
  let mockQuantumVerifier, mockZKVerifier;
  let owner, voter, otherAccount;

  beforeEach(async function () {
    [owner, voter, otherAccount] = await ethers.getSigners();

    const MockQuantumVerifier = await ethers.getContractFactory("MockQuantumVerifier");
    mockQuantumVerifier = await MockQuantumVerifier.deploy();

    const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
    mockZKVerifier = await MockZKVerifier.deploy();

    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();

    const GovernancePlugin = await ethers.getContractFactory("GovernancePlugin");
    governancePlugin = await GovernancePlugin.deploy(
      await dao.getAddress(),
      await mockQuantumVerifier.getAddress(),
      await mockZKVerifier.getAddress()
    );

    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await dao.getAddress());

    const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
    await dao.grant(await dao.getAddress(), await governancePlugin.getAddress(), EXECUTE_PERMISSION_ID);
    
    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("1.0"),
    });
  });

  it("Should allow a full governance flow: Proposal -> Hybrid Vote -> Execution", async function () {
    const treasuryAddress = await treasury.getAddress();
    const recipient = otherAccount.address;
    const amount = ethers.parseEther("0.1");

    const targets = [treasuryAddress];
    const values = [0];
    const callDatas = [
      treasury.interface.encodeFunctionData("withdraw", [recipient, amount])
    ];

    await governancePlugin.createProposal(targets, values, callDatas);
    const proposalId = 0;

    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "address"],
      [proposalId, voter.address, await governancePlugin.getAddress()]
    );
    
    const pqSignature = messageHash;
    const pqPublicKey = "0x1234";

    await expect(governancePlugin.connect(voter).castVoteHybrid(proposalId, pqPublicKey, pqSignature))
      .to.emit(governancePlugin, "VoteCast")
      .withArgs(proposalId, voter.address)
      .to.emit(governancePlugin, "ProposalExecuted")
      .withArgs(proposalId);

    expect(await ethers.provider.getBalance(recipient)).to.be.at.least(amount);
  });

  it("Should prevent malicious execution via downgrade attack (missing PQ signature)", async function () {
    const targets = [otherAccount.address];
    const values = [0];
    const callDatas = ["0x"];

    await governancePlugin.createProposal(targets, values, callDatas);
    const proposalId = 0;

    await expect(governancePlugin.connect(voter).castVoteHybrid(proposalId, "0x", "0x"))
      .to.be.revertedWithCustomError(governancePlugin, "InvalidAuth");
  });

  it("Should allow anonymous voting via ZK-gated participation", async function () {
    const targets = [otherAccount.address];
    const values = [0];
    const callDatas = ["0x"];

    await governancePlugin.createProposal(targets, values, callDatas);
    const proposalId = 1;

    const zkProof = ethers.toBeHex(ethers.toUtf8Bytes("valid_proof"));
    const nullifier = ethers.encodeBytes32String("nullifier_1");

    await expect(governancePlugin.castVoteZK(proposalId, zkProof, nullifier))
      .to.emit(governancePlugin, "VoteCast")
      .to.emit(governancePlugin, "ProposalExecuted");
  });
});
