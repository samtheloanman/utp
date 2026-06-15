
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("UBTC", function () {
  async function deployUBTCFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const UBTCFactory = await ethers.getContractFactory("UBTC");
    const ubtc = await UBTCFactory.deploy();
    await ubtc.waitForDeployment();
    return { ubtc, owner, otherAccount };
  }

  it("Should fail because the contract does not exist", async function () {
    // This test will fail at the `deployUBTCFixture` stage because the `UBTC` contract
    // does not exist yet. This is the "RED" step of our TDD process for Task 1.
    // We expect the test command to fail.
    await loadFixture(deployUBTCFixture);
  });
});
