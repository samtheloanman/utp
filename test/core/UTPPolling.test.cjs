const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UTPPolling", function () {
  let UTPPolling;
  let polling;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    UTPPolling = await ethers.getContractFactory("UTPPolling");
    [owner, addr1, addr2] = await ethers.getSigners();
    polling = await UTPPolling.deploy();
    await polling.waitForDeployment();
  });

  it("Should record a 'for' vote correctly", async function () {
    await polling.connect(addr1).castVote("issue-1", 1);
    const count = await polling.getVoteCounts("issue-1");
    expect(count.forVotes).to.equal(1);
    expect(count.totalVoices).to.equal(1);
  });

  it("Should allow changing a vote", async function () {
    await polling.connect(addr1).castVote("issue-1", 1);
    await polling.connect(addr1).castVote("issue-1", 2);
    
    const count = await polling.getVoteCounts("issue-1");
    expect(count.forVotes).to.equal(0);
    expect(count.againstVotes).to.equal(1);
    expect(count.totalVoices).to.equal(1);
  });

  it("Should emit a Voted event", async function () {
    await expect(polling.connect(addr1).castVote("issue-1", 3))
      .to.emit(polling, "Voted")
      .withArgs("issue-1", addr1.address, 3);
  });
});
