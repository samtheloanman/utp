import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("StablecoinController + UBTC", function () {
  let dao, ubtc, controller, oracle;
  let owner, depositor, liquidator, unauthorized;

  beforeEach(async function () {
    [owner, depositor, liquidator, unauthorized] = await ethers.getSigners();

    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();
    const daoAddress = await dao.getAddress();

    // Deploy Oracle
    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    oracle = await MockPriceOracle.deploy(); // $65K default

    // Deploy UBTC first (no controller yet)
    const UBTC = await ethers.getContractFactory("UBTC");
    ubtc = await UBTC.deploy();

    // Deploy Controller with UBTC address
    const StablecoinController = await ethers.getContractFactory("StablecoinController");
    controller = await StablecoinController.deploy(
      daoAddress,
      await ubtc.getAddress(),
      await oracle.getAddress()
    );

    // Wire UBTC → Controller
    await ubtc.setController(await controller.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct DAO address", async function () {
      expect(await controller.dao()).to.equal(await dao.getAddress());
    });

    it("Should set the correct UBTC address", async function () {
      expect(await controller.ubtc()).to.equal(await ubtc.getAddress());
    });

    it("Should have correct default parameters", async function () {
      expect(await controller.collateralRatioBps()).to.equal(15000);
      expect(await controller.liquidationRatioBps()).to.equal(12000);
      expect(await controller.mintLimitPerDay()).to.equal(ethers.parseEther("1000000"));
      expect(await controller.feeBps()).to.equal(10);
      expect(await controller.paused()).to.be.false;
    });

    it("Should prevent setting controller twice", async function () {
      await expect(
        ubtc.setController(unauthorized.address)
      ).to.be.revertedWithCustomError(ubtc, "ControllerAlreadySet");
    });
  });

  describe("Deposit & Mint", function () {
    it("Should allow depositing RBTC and minting UBTC", async function () {
      // 1 RBTC at $65K → can mint up to $43,333 at 150% ratio
      const rbtcDeposit = ethers.parseEther("1");
      const ubtcToMint = ethers.parseEther("40000");

      await expect(
        controller.connect(depositor).deposit(ubtcToMint, { value: rbtcDeposit })
      ).to.emit(controller, "Deposit")
        .withArgs(depositor.address, rbtcDeposit, ubtcToMint);

      expect(await ubtc.balanceOf(depositor.address)).to.equal(ubtcToMint);
    });

    it("Should revert if collateral ratio too low", async function () {
      const rbtcDeposit = ethers.parseEther("1");
      const tooMuchUBTC = ethers.parseEther("50000");

      await expect(
        controller.connect(depositor).deposit(tooMuchUBTC, { value: rbtcDeposit })
      ).to.be.revertedWithCustomError(controller, "BelowCollateralRatio");
    });

    it("Should revert with zero RBTC", async function () {
      await expect(
        controller.connect(depositor).deposit(ethers.parseEther("100"), { value: 0 })
      ).to.be.revertedWithCustomError(controller, "ZeroAmount");
    });

    it("Should revert with zero UBTC amount", async function () {
      await expect(
        controller.connect(depositor).deposit(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(controller, "ZeroAmount");
    });

    it("Should track position correctly", async function () {
      const rbtcDeposit = ethers.parseEther("1");
      const ubtcToMint = ethers.parseEther("40000");

      await controller.connect(depositor).deposit(ubtcToMint, { value: rbtcDeposit });

      const position = await controller.positions(depositor.address);
      expect(position.collateral).to.equal(rbtcDeposit);
      expect(position.debt).to.equal(ubtcToMint);
    });

    it("Should update total collateral", async function () {
      const rbtcDeposit = ethers.parseEther("2");
      const ubtcToMint = ethers.parseEther("50000");

      await controller.connect(depositor).deposit(ubtcToMint, { value: rbtcDeposit });
      expect(await controller.totalCollateral()).to.equal(rbtcDeposit);
    });

    it("Should revert when paused", async function () {
      const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
      await dao.grant(await dao.getAddress(), owner.address, EXECUTE_PERMISSION_ID);

      const targets = [await controller.getAddress()];
      const values = [0];
      const callDatas = [
        controller.interface.encodeFunctionData("setPaused", [true])
      ];
      await dao.execute(targets, values, callDatas);

      await expect(
        controller.connect(depositor).deposit(ethers.parseEther("100"), { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(controller, "Paused");
    });
  });

  describe("Redeem", function () {
    beforeEach(async function () {
      await controller.connect(depositor).deposit(
        ethers.parseEther("80000"),
        { value: ethers.parseEther("2") }
      );
    });

    it("Should allow redeeming UBTC for RBTC", async function () {
      const redeemAmount = ethers.parseEther("40000");

      const balanceBefore = await ethers.provider.getBalance(depositor.address);
      const tx = await controller.connect(depositor).redeem(redeemAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(depositor.address);

      const rbtcReturned = balanceAfter - balanceBefore + gasUsed;
      expect(rbtcReturned).to.equal(ethers.parseEther("1"));

      expect(await ubtc.balanceOf(depositor.address)).to.equal(ethers.parseEther("40000"));
    });

    it("Should revert if redeeming more than debt", async function () {
      await expect(
        controller.connect(depositor).redeem(ethers.parseEther("100000"))
      ).to.be.revertedWithCustomError(controller, "InsufficientDebt");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        controller.connect(depositor).redeem(0)
      ).to.be.revertedWithCustomError(controller, "ZeroAmount");
    });

    it("Should allow full redemption", async function () {
      await controller.connect(depositor).redeem(ethers.parseEther("80000"));

      expect(await ubtc.balanceOf(depositor.address)).to.equal(0);
      const position = await controller.positions(depositor.address);
      expect(position.debt).to.equal(0);
      expect(position.collateral).to.equal(0);
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      // Depositor: 1 RBTC at $65K, mint $43K UBTC (~151% ratio)
      await controller.connect(depositor).deposit(
        ethers.parseEther("43000"),
        { value: ethers.parseEther("1") }
      );

      // Liquidator: needs UBTC to cover debt
      await controller.connect(liquidator).deposit(
        ethers.parseEther("10000"),
        { value: ethers.parseEther("1") }
      );
    });

    it("Should allow liquidation when below liquidation ratio", async function () {
      // Drop BTC price to $45K — ratio = ($45K / $43K) * 10000 = ~10465 (104.65%)
      await oracle.setPrice(45_000n * 10n ** 8n);

      await expect(
        controller.connect(liquidator).liquidate(depositor.address, ethers.parseEther("10000"))
      ).to.emit(controller, "Liquidated");
    });

    it("Should reject liquidation when position is healthy", async function () {
      await expect(
        controller.connect(liquidator).liquidate(depositor.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(controller, "NotLiquidatable");
    });

    it("Should give liquidator collateral + bonus", async function () {
      await oracle.setPrice(45_000n * 10n ** 8n);

      const liqBalanceBefore = await ethers.provider.getBalance(liquidator.address);
      const tx = await controller.connect(liquidator).liquidate(depositor.address, ethers.parseEther("10000"));
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const liqBalanceAfter = await ethers.provider.getBalance(liquidator.address);

      const rbtcGained = liqBalanceAfter - liqBalanceBefore + gasUsed;
      expect(rbtcGained).to.be.gt(0);
    });
  });

  describe("Collateral Ratio", function () {
    it("Should return max for empty position", async function () {
      expect(await controller.getCollateralRatio(depositor.address)).to.equal(ethers.MaxUint256);
    });

    it("Should calculate correct ratio", async function () {
      await controller.connect(depositor).deposit(
        ethers.parseEther("40000"),
        { value: ethers.parseEther("1") }
      );
      // ($65K / $40K) * 10000 = 16250 bps
      expect(await controller.getCollateralRatio(depositor.address)).to.equal(16250);
    });

    it("Should update when price changes", async function () {
      await controller.connect(depositor).deposit(
        ethers.parseEther("40000"),
        { value: ethers.parseEther("1") }
      );
      await oracle.setPrice(50_000n * 10n ** 8n);
      // ($50K / $40K) * 10000 = 12500 bps
      expect(await controller.getCollateralRatio(depositor.address)).to.equal(12500);
    });
  });

  describe("DAO Governance", function () {
    beforeEach(async function () {
      const EXECUTE_PERMISSION_ID = await dao.EXECUTE_PERMISSION_ID();
      await dao.grant(await dao.getAddress(), owner.address, EXECUTE_PERMISSION_ID);
    });

    it("Should allow DAO to update collateral ratio", async function () {
      const targets = [await controller.getAddress()];
      const values = [0];
      const callDatas = [
        controller.interface.encodeFunctionData("setCollateralRatio", [20000])
      ];
      await dao.execute(targets, values, callDatas);
      expect(await controller.collateralRatioBps()).to.equal(20000);
    });

    it("Should allow DAO to update liquidation ratio", async function () {
      const targets = [await controller.getAddress()];
      const values = [0];
      const callDatas = [
        controller.interface.encodeFunctionData("setLiquidationRatio", [11000])
      ];
      await dao.execute(targets, values, callDatas);
      expect(await controller.liquidationRatioBps()).to.equal(11000);
    });

    it("Should allow DAO to change oracle", async function () {
      const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
      const newOracle = await MockPriceOracle.deploy();

      const targets = [await controller.getAddress()];
      const values = [0];
      const callDatas = [
        controller.interface.encodeFunctionData("setOracle", [await newOracle.getAddress()])
      ];
      await dao.execute(targets, values, callDatas);
      expect(await controller.priceOracle()).to.equal(await newOracle.getAddress());
    });

    it("Should prevent unauthorized parameter changes", async function () {
      await expect(
        controller.connect(unauthorized).setCollateralRatio(20000)
      ).to.be.revertedWithCustomError(controller, "Unauthorized");
    });

    it("Should allow DAO to pause and unpause", async function () {
      const targets = [await controller.getAddress()];
      const values = [0];
      let callDatas = [controller.interface.encodeFunctionData("setPaused", [true])];
      await dao.execute(targets, values, callDatas);
      expect(await controller.paused()).to.be.true;

      callDatas = [controller.interface.encodeFunctionData("setPaused", [false])];
      await dao.execute(targets, values, callDatas);
      expect(await controller.paused()).to.be.false;
    });
  });
});
