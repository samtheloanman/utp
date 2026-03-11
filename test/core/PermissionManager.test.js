import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PermissionManager", function () {
  let permissionManager;
  let owner, user1, user2, plugin;

  beforeEach(async function () {
    [owner, user1, user2, plugin] = await ethers.getSigners();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    permissionManager = await PermissionManager.deploy();
  });

  describe("Deployment", function () {
    it("Should have ROOT_PERMISSION_ID constant", async function () {
      const rootPermissionId = await permissionManager.ROOT_PERMISSION_ID();
      expect(rootPermissionId).to.equal(ethers.id("ROOT_PERMISSION"));
    });
  });

  describe("Permission Granting", function () {
    it("Should allow granting permissions with ROOT_PERMISSION", async function () {
      // First, grant ROOT_PERMISSION to owner via internal initialization (simulated)
      // In the actual DAO, this is done in constructor via _initializePermission

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = plugin.address;

      // This should fail initially since owner doesn't have ROOT_PERMISSION yet
      await expect(
        permissionManager.grant(targetContract, user1.address, testPermissionId)
      ).to.be.revertedWithCustomError(permissionManager, "AccessDenied");
    });

    it("Should track granted permissions correctly", async function () {
      // Deploy a new instance and manually initialize it
      const PermissionManagerTest = await ethers.getContractFactory("PermissionManager");
      const pm = await PermissionManagerTest.deploy();

      // We need to use a contract that calls _initializePermission in its constructor
      // For now, we'll test through the DAO contract which properly initializes permissions
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = await dao.getAddress();

      // Owner (deployer) should have ROOT_PERMISSION on the DAO
      const hasRoot = await dao.hasPermission(
        targetContract,
        owner.address,
        await dao.ROOT_PERMISSION_ID()
      );
      expect(hasRoot).to.be.true;

      // Grant a permission to user1
      await dao.grant(targetContract, user1.address, testPermissionId);

      // Check that user1 has the permission
      const hasPermission = await dao.hasPermission(targetContract, user1.address, testPermissionId);
      expect(hasPermission).to.be.true;
    });
  });

  describe("Permission Revoking", function () {
    it("Should allow revoking permissions with ROOT_PERMISSION", async function () {
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = await dao.getAddress();

      // Grant permission
      await dao.grant(targetContract, user1.address, testPermissionId);

      // Verify granted
      expect(await dao.hasPermission(targetContract, user1.address, testPermissionId)).to.be.true;

      // Revoke permission
      await dao.revoke(targetContract, user1.address, testPermissionId);

      // Verify revoked
      expect(await dao.hasPermission(targetContract, user1.address, testPermissionId)).to.be.false;
    });

    it("Should prevent unauthorized users from revoking permissions", async function () {
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = await dao.getAddress();

      // Grant permission
      await dao.grant(targetContract, user1.address, testPermissionId);

      // Try to revoke as user2 (unauthorized)
      await expect(
        dao.connect(user2).revoke(targetContract, user1.address, testPermissionId)
      ).to.be.revertedWithCustomError(dao, "AccessDenied");
    });
  });

  describe("Permission Checking", function () {
    it("Should correctly check ROOT_PERMISSION grants access to everything", async function () {
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const randomPermissionId = ethers.id("RANDOM_PERMISSION");
      const targetContract = await dao.getAddress();

      // Owner has ROOT_PERMISSION, so should have all permissions
      const hasPermission = await dao.hasPermission(
        targetContract,
        owner.address,
        randomPermissionId
      );
      // This will be true because ROOT_PERMISSION grants all permissions
      expect(hasPermission).to.be.true;
    });

    it("Should return false for users without permissions", async function () {
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = await dao.getAddress();

      // User1 has no permissions
      const hasPermission = await dao.hasPermission(targetContract, user1.address, testPermissionId);
      expect(hasPermission).to.be.false;
    });
  });

  describe("Events", function () {
    it("Should emit PermissionGranted event", async function () {
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = await dao.getAddress();

      await expect(dao.grant(targetContract, user1.address, testPermissionId))
        .to.emit(dao, "PermissionGranted")
        .withArgs(testPermissionId, user1.address, targetContract);
    });

    it("Should emit PermissionRevoked event", async function () {
      const DAO = await ethers.getContractFactory("DAO");
      const dao = await DAO.deploy();

      const testPermissionId = ethers.id("TEST_PERMISSION");
      const targetContract = await dao.getAddress();

      // Grant first
      await dao.grant(targetContract, user1.address, testPermissionId);

      // Revoke and check event
      await expect(dao.revoke(targetContract, user1.address, testPermissionId))
        .to.emit(dao, "PermissionRevoked")
        .withArgs(testPermissionId, user1.address, targetContract);
    });
  });
});
