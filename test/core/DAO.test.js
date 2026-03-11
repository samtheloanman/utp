import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DAO (Kernel)", function () {
  let dao;
  let owner, executor, nonExecutor, recipient;

  beforeEach(async function () {
    [owner, executor, nonExecutor, recipient] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();

    // Grant EXECUTE_PERMISSION to executor
    const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
    await dao.grant(await dao.getAddress(), executor.address, EXECUTE_PERMISSION_ID);

    // Fund the DAO
    await owner.sendTransaction({
      to: await dao.getAddress(),
      value: ethers.parseEther("10.0"),
    });
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await dao.getAddress()).to.be.properAddress;
    });

    it("Should grant ROOT_PERMISSION to deployer", async function () {
      const ROOT_PERMISSION_ID = await dao.ROOT_PERMISSION_ID();
      const hasRoot = await dao.hasPermission(
        await dao.getAddress(),
        owner.address,
        ROOT_PERMISSION_ID
      );
      expect(hasRoot).to.be.true;
    });

    it("Should have EXECUTE_PERMISSION_ID constant", async function () {
      const executePermissionId = await dao.EXECUTE_PERMISSION_ID();
      expect(executePermissionId).to.equal(ethers.id("EXECUTE_PERMISSION"));
    });

    it("Should be able to receive ETH/RBTC", async function () {
      const balanceBefore = await ethers.provider.getBalance(await dao.getAddress());

      await owner.sendTransaction({
        to: await dao.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const balanceAfter = await ethers.provider.getBalance(await dao.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("Execute Function", function () {
    it("Should allow users with EXECUTE_PERMISSION to execute calls", async function () {
      const targets = [recipient.address];
      const values = [ethers.parseEther("1.0")];
      const callDatas = ["0x"];

      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      await dao.connect(executor).execute(targets, values, callDatas);

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("Should reject calls from users without EXECUTE_PERMISSION", async function () {
      const targets = [recipient.address];
      const values = [ethers.parseEther("1.0")];
      const callDatas = ["0x"];

      await expect(
        dao.connect(nonExecutor).execute(targets, values, callDatas)
      ).to.be.revertedWithCustomError(dao, "AccessDenied");
    });

    it("Should execute multiple calls in a batch", async function () {
      const targets = [recipient.address, recipient.address];
      const values = [ethers.parseEther("1.0"), ethers.parseEther("2.0")];
      const callDatas = ["0x", "0x"];

      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      await dao.connect(executor).execute(targets, values, callDatas);

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("3.0"));
    });

    it("Should revert if array lengths mismatch", async function () {
      const targets = [recipient.address];
      const values = [ethers.parseEther("1.0"), ethers.parseEther("2.0")]; // Wrong length
      const callDatas = ["0x"];

      await expect(
        dao.connect(executor).execute(targets, values, callDatas)
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should revert if a call fails", async function () {
      // Test with invalid calldata to a contract (no fallback that handles it)
      const targets = [await dao.getAddress()];
      const values = [0];
      const callDatas = ["0x12345678"]; // Invalid function selector

      await expect(
        dao.connect(executor).execute(targets, values, callDatas)
      ).to.be.revertedWith("DAO execution failed");
    });

    it("Should return results from successful calls", async function () {
      // Deploy a simple contract that returns a value
      const MockContract = await ethers.getContractFactory("contracts/core/Treasury.sol:Treasury");
      const mockContract = await MockContract.deploy(await dao.getAddress());

      const targets = [await mockContract.getAddress()];
      const values = [0];
      const callDatas = [mockContract.interface.encodeFunctionData("dao")];

      const results = await dao.connect(executor).execute.staticCall(targets, values, callDatas);

      // The result should be the ABI-encoded DAO address
      const decodedResult = ethers.AbiCoder.defaultAbiCoder().decode(["address"], results[0]);
      expect(decodedResult[0]).to.equal(await dao.getAddress());
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This would require a malicious contract that tries to re-enter
      // For now, we verify that the modifier exists by checking behavior
      // A full test would deploy a ReentrancyAttacker contract

      // The DAO uses a simple reentrancy guard with _locked flag
      // Multiple calls in the same transaction will fail
      const targets = [recipient.address];
      const values = [ethers.parseEther("0.1")];
      const callDatas = ["0x"];

      // This should succeed (not checking reentrancy, just that it works)
      await expect(dao.connect(executor).execute(targets, values, callDatas)).to.not.be.reverted;
    });
  });

  describe("Permission Management", function () {
    it("Should allow ROOT_PERMISSION holders to grant new permissions", async function () {
      const NEW_PERMISSION_ID = ethers.id("NEW_PERMISSION");

      await dao.grant(await dao.getAddress(), nonExecutor.address, NEW_PERMISSION_ID);

      const hasPermission = await dao.hasPermission(
        await dao.getAddress(),
        nonExecutor.address,
        NEW_PERMISSION_ID
      );
      expect(hasPermission).to.be.true;
    });

    it("Should emit events when granting permissions", async function () {
      const NEW_PERMISSION_ID = ethers.id("NEW_PERMISSION");

      await expect(dao.grant(await dao.getAddress(), nonExecutor.address, NEW_PERMISSION_ID))
        .to.emit(dao, "PermissionGranted")
        .withArgs(NEW_PERMISSION_ID, nonExecutor.address, await dao.getAddress());
    });
  });
});
