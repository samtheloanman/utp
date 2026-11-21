const { expect } = require("chai");
const hre = require("hardhat");
const { mine, time, setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { deployCore, verifyCore } = require("../scripts/lib/deploy-core.cjs");
const deployConfig = require("../scripts/deploy.config.cjs");
const hardhatConfig = require("../hardhat.config.cjs");
const {
  distributeAndVerify,
  assertPreProposalDelegation,
  parseStipendWei,
  VOTER_ALLOCATION,
  DEFAULT_STIPEND_WEI,
} = require("../scripts/distribute-testnet.cjs");

const { ethers } = hre;

const STATE = {
  Pending: 0n,
  Active: 1n,
  Canceled: 2n,
  Defeated: 3n,
  Succeeded: 4n,
  Queued: 5n,
  Expired: 6n,
  Executed: 7n,
};
const FOR = 1;

describe("Wave 2 & Wave 3 DAO POC (GovernorStorage + AppConfig + 4-Role Distribution)", function () {
  let deployer, voterA, voterB, guardian, outsider;

  beforeEach(async function () {
    [deployer, voterA, voterB, guardian, outsider] = await ethers.getSigners();
  });

  describe("1. EvmCanary Cancun Execution", function () {
    it("exercises PUSH0, MCOPY, and EIP-1153 TSTORE/TLOAD (42) on deploy and call", async function () {
      const EvmCanary = await ethers.getContractFactory("EvmCanary", deployer);
      const canary = await EvmCanary.deploy();
      await canary.waitForDeployment();

      expect(await canary.deployedOk()).to.equal(true);

      const expectedPayload = ethers.hexlify(ethers.toUtf8Bytes("utp-cancun"));
      await expect(canary.checkCancunOpcodes())
        .to.emit(canary, "CancunCanaryVerified")
        .withArgs(42n, expectedPayload);

      const [transientVal, copied, zeroVal] = await canary.checkCancunOpcodes.staticCall().catch(async () => {
        // EIP-1153 disallows TSTORE in staticcall; simulate via non-view call
        const tx = await canary.checkCancunOpcodes();
        const rcpt = await tx.wait();
        const parsed = rcpt.logs
          .map((l) => {
            try {
              return canary.interface.parseLog(l);
            } catch {
              return null;
            }
          })
          .find((e) => e && e.name === "CancunCanaryVerified");
        return [parsed.args[0], parsed.args[1], 0n];
      });

      expect(transientVal).to.equal(42n);
      expect(ethers.toUtf8String(copied)).to.equal("utp-cancun");
      expect(zeroVal).to.equal(0n);
    });
  });

  describe("2. Network Config & 4-Role Multi-Signer Distribution", function () {
    it("supports RSK_TESTNET_VOTING_PERIOD, RSK_TESTNET_MIN_BALANCE_WEI, dynamic gasPrice, and utpAlpha config", function () {
      const defaultCfg = deployConfig.buildDeployConfig({});
      expect(defaultCfg.rskTestnet.chainId).to.equal(31);
      expect(defaultCfg.rskTestnet.votingPeriod).to.equal(2880);
      expect(defaultCfg.rskTestnet.minDeployerBalance).to.equal(ethers.parseEther("0.0004"));
      expect(defaultCfg.utpAlpha.chainId).to.equal(99931);

      const rehearsalCfg = deployConfig.buildDeployConfig({
        RSK_TESTNET_VOTING_PERIOD: "90",
        RSK_TESTNET_MIN_BALANCE_WEI: "1000000000000000",
        UTP_ALPHA_CHAIN_ID: "99932",
      });
      expect(rehearsalCfg.rskTestnet.votingPeriod).to.equal(90);
      expect(rehearsalCfg.rskTestnet.minDeployerBalance).to.equal(1000000000000000n);
      expect(rehearsalCfg.utpAlpha.chainId).to.equal(99932);
      expect(deployConfig.buildDeployConfig({ RSK_TESTNET_MIN_BALANCE_WEI: "0" }).rskTestnet.minDeployerBalance).to.equal(0n);
      expect(() => deployConfig.buildDeployConfig({ RSK_TESTNET_MIN_BALANCE_WEI: "-1" })).to.throw(/RSK_TESTNET_MIN_BALANCE_WEI/);
      expect(() => deployConfig.buildDeployConfig({ RSK_TESTNET_MIN_BALANCE_WEI: "abc" })).to.throw(/RSK_TESTNET_MIN_BALANCE_WEI/);
      expect(hardhatConfig.networks.utpAlpha.chainId).to.equal(99931);
      if (!process.env.RSK_TESTNET_GAS_PRICE) {
        expect(hardhatConfig.networks.rskTestnet.gasPrice).to.equal("auto");
      }
      expect(hardhatConfig.resolveGasPrice(undefined)).to.equal("auto");
      expect(hardhatConfig.resolveGasPrice("")).to.equal("auto");
      expect(hardhatConfig.resolveGasPrice("   ")).to.equal("auto");
      expect(hardhatConfig.resolveGasPrice("AUTO")).to.equal("auto");
      expect(hardhatConfig.resolveGasPrice(" auto ")).to.equal("auto");
      expect(hardhatConfig.resolveGasPrice("60000000")).to.equal(60000000);
      expect(() => hardhatConfig.resolveGasPrice("0")).to.throw(/RSK_TESTNET_GAS_PRICE/);
      expect(() => hardhatConfig.resolveGasPrice("-5")).to.throw(/RSK_TESTNET_GAS_PRICE/);
      expect(() => hardhatConfig.resolveGasPrice("abc")).to.throw(/RSK_TESTNET_GAS_PRICE/);

      expect(parseStipendWei(undefined, DEFAULT_STIPEND_WEI)).to.equal(DEFAULT_STIPEND_WEI);
      expect(parseStipendWei("", DEFAULT_STIPEND_WEI)).to.equal(DEFAULT_STIPEND_WEI);
      expect(parseStipendWei("   ", DEFAULT_STIPEND_WEI)).to.equal(DEFAULT_STIPEND_WEI);
      expect(parseStipendWei("0", DEFAULT_STIPEND_WEI)).to.equal(0n);
      expect(parseStipendWei("100000000000000", DEFAULT_STIPEND_WEI)).to.equal(100000000000000n);
      expect(() => parseStipendWei("-1", DEFAULT_STIPEND_WEI)).to.throw(/STIPEND_WEI/);
      expect(() => parseStipendWei("abc", DEFAULT_STIPEND_WEI)).to.throw(/STIPEND_WEI/);
    });

    it("rejects zero addresses and duplicate role assignments in distributeAndVerify", async function () {
      const core = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        guardian: guardian.address,
      });

      await expect(
        distributeAndVerify({
          token: core.contracts.token,
          deployer,
          voterA: ethers.ZeroAddress,
          voterB: voterB.address,
          guardian: guardian.address,
          timelockAddress: core.addresses.UtPTimelock,
        })
      ).to.be.rejectedWith(/ZeroAddress/);

      await expect(
        distributeAndVerify({
          token: core.contracts.token,
          deployer,
          voterA: voterA.address,
          voterB: voterA.address,
          guardian: guardian.address,
          timelockAddress: core.addresses.UtPTimelock,
        })
      ).to.be.rejectedWith(/4-role separation violation/);

      await expect(
        distributeAndVerify({
          token: core.contracts.token,
          deployer,
          voterA: voterA.address,
          voterB: voterB.address,
          guardian: deployer.address,
          timelockAddress: core.addresses.UtPTimelock,
        })
      ).to.be.rejectedWith(/4-role separation violation/);
    });

    it("splits 250k/200k/50k across three voters when voterC is given (PRD: 3 distinct wallets)", async function () {
      const core = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        guardian: guardian.address,
      });
      const args = {
        token: core.contracts.token,
        deployer,
        voterA: voterA.address,
        voterB: voterB.address,
        guardian: guardian.address,
        timelockAddress: core.addresses.UtPTimelock,
      };
      await expect(distributeAndVerify({ ...args, voterC: voterA.address })).to.be.rejectedWith(
        /separation violation/
      );

      const summary = await distributeAndVerify({ ...args, voterC: outsider.address });
      expect(summary.voterABalance).to.equal(ethers.parseEther("250000"));
      expect(summary.voterBBalance).to.equal(ethers.parseEther("200000"));
      expect(summary.voterCBalance).to.equal(ethers.parseEther("50000"));
      expect(summary.voterC).to.equal(outsider.address);
      expect(summary.timelockBalance).to.equal(ethers.parseEther("9500000"));
      expect(await core.contracts.token.balanceOf(deployer.address)).to.equal(0n);

      // 3-wallet pre-proposal delegation check catches undelegated voterC and passes once all 3 delegate
      await (await core.contracts.token.connect(voterA).delegate(voterA.address)).wait();
      await (await core.contracts.token.connect(voterB).delegate(voterB.address)).wait();
      await expect(
        assertPreProposalDelegation(
          core.contracts.token,
          voterA.address,
          voterB.address,
          undefined,
          outsider.address
        )
      ).to.be.rejectedWith(/voterC/);

      await (await core.contracts.token.connect(outsider).delegate(outsider.address)).wait();
      const verified = await assertPreProposalDelegation(
        core.contracts.token,
        voterA.address,
        voterB.address,
        undefined,
        outsider.address
      );
      expect(verified.voterAVotes).to.equal(ethers.parseEther("250000"));
      expect(verified.voterBVotes).to.equal(ethers.parseEther("200000"));
      expect(verified.voterCVotes).to.equal(ethers.parseEther("50000"));

      // Guardrail: passing a Signer or address in the 4th (minWeight) slot must throw, not silently skip voterC
      await expect(
        assertPreProposalDelegation(core.contracts.token, voterA.address, voterB.address, outsider)
      ).to.be.rejectedWith(/Invalid minWeight/);
      await expect(
        assertPreProposalDelegation(
          core.contracts.token,
          voterA.address,
          voterB.address,
          outsider.address
        )
      ).to.be.rejectedWith(/Invalid minWeight/);
      await expect(
        assertPreProposalDelegation(core.contracts.token, voterA.address, voterB.address, {
          voterC: ethers.parseEther("50000"),
        })
      ).to.be.rejectedWith(/without a voterC address/);
    });

    it("forwards native gas stipend to an unfunded voterC when stipendWei > 0n", async function () {
      const core = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        guardian: guardian.address,
      });
      const lowBalanceVoterC = ethers.Wallet.createRandom().connect(ethers.provider);
      await setBalance(lowBalanceVoterC.address, ethers.parseEther("0.0001"));

      const summary = await distributeAndVerify({
        token: core.contracts.token,
        deployer,
        voterA: voterA.address,
        voterB: voterB.address,
        voterC: lowBalanceVoterC.address,
        guardian: guardian.address,
        timelockAddress: core.addresses.UtPTimelock,
        stipendWei: DEFAULT_STIPEND_WEI,
      });

      expect(summary.voterCBalance).to.equal(ethers.parseEther("50000"));
      expect(summary.stipendsSent).to.have.lengthOf(1);
      expect(summary.stipendsSent[0].role).to.equal("voterC");
      expect(summary.stipendsSent[0].address).to.equal(lowBalanceVoterC.address);
      expect(await ethers.provider.getBalance(lowBalanceVoterC.address)).to.equal(
        ethers.parseEther("0.0021")
      );
    });

    it("caps stipend threshold to stipendWei when stipendWei < MIN_NATIVE_BALANCE to prevent double-sends", async function () {
      const core = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        guardian: guardian.address,
      });
      const smallStipend = ethers.parseEther("0.0001"); // 100000000000000 wei
      const unfundedVoter = ethers.Wallet.createRandom().connect(ethers.provider);
      const alreadyFundedVoter = ethers.Wallet.createRandom().connect(ethers.provider);
      await setBalance(unfundedVoter.address, 0n);
      await setBalance(alreadyFundedVoter.address, smallStipend);

      const summary = await distributeAndVerify({
        token: core.contracts.token,
        deployer,
        voterA: unfundedVoter.address,
        voterB: alreadyFundedVoter.address,
        guardian: guardian.address,
        timelockAddress: core.addresses.UtPTimelock,
        stipendWei: smallStipend,
      });

      expect(summary.stipendsSent).to.have.lengthOf(1);
      expect(summary.stipendsSent[0].role).to.equal("voterA");
      expect(summary.stipendsSent[0].amountWei).to.equal(smallStipend);
      expect(await ethers.provider.getBalance(unfundedVoter.address)).to.equal(smallStipend);
      expect(await ethers.provider.getBalance(alreadyFundedVoter.address)).to.equal(smallStipend);

      const core2 = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        guardian: guardian.address,
      });
      await expect(
        distributeAndVerify({
          token: core2.contracts.token,
          deployer,
          voterA: voterA.address,
          voterB: voterB.address,
          guardian: guardian.address,
          timelockAddress: core2.addresses.UtPTimelock,
          stipendWei: -1n,
        })
      ).to.be.rejectedWith(/stipendWei must be non-negative/);
      expect(await core2.contracts.token.balanceOf(deployer.address)).to.equal(
        ethers.parseEther("10000000")
      );
    });

    it("distributes 250k/250k/9.5M, zeroes deployer balance & votes, forwards gas stipends, and catches undelegated ERC20Votes signers", async function () {
      const core = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        guardian: guardian.address,
      });
      await verifyCore(core, deployer.address);
      expect(await core.contracts.appConfig.owner()).to.equal(core.addresses.UtPTimelock);

      // Simulate unfunded voterB & guardian (< 0.001 native)
      const lowBalanceWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await setBalance(lowBalanceWallet.address, ethers.parseEther("0.0002"));

      const summary = await distributeAndVerify({
        token: core.contracts.token,
        deployer,
        voterA: voterA.address,
        voterB: lowBalanceWallet.address,
        guardian: guardian.address,
        timelockAddress: core.addresses.UtPTimelock,
        stipendWei: DEFAULT_STIPEND_WEI,
      });

      expect(summary.voterABalance).to.equal(VOTER_ALLOCATION);
      expect(summary.voterBBalance).to.equal(VOTER_ALLOCATION);
      expect(summary.timelockBalance).to.equal(ethers.parseEther("9500000"));
      expect(await core.contracts.token.balanceOf(deployer.address)).to.equal(0n);
      expect(await core.contracts.token.getVotes(deployer.address)).to.equal(0n);
      expect(summary.stipendsSent).to.have.lengthOf(1);
      expect(await ethers.provider.getBalance(lowBalanceWallet.address)).to.equal(
        ethers.parseEther("0.0022")
      );

      // Before delegate(): balance is 250k, but ERC20Votes weight is 0 -> MUST throw!
      await expect(
        assertPreProposalDelegation(
          core.contracts.token,
          voterA.address,
          lowBalanceWallet.address,
          VOTER_ALLOCATION
        )
      ).to.be.rejectedWith(/Pre-proposal delegation check failed/);

      // Delegate voterA only -> voterB still undelegated -> MUST still throw!
      await (await core.contracts.token.connect(voterA).delegate(voterA.address)).wait();
      await expect(
        assertPreProposalDelegation(
          core.contracts.token,
          voterA.address,
          lowBalanceWallet.address,
          VOTER_ALLOCATION
        )
      ).to.be.rejectedWith(/voterB/);

      // Delegate voterB -> pre-proposal check passes with 250k each
      await (await core.contracts.token.connect(lowBalanceWallet).delegate(lowBalanceWallet.address)).wait();
      const verifiedVotes = await assertPreProposalDelegation(
        core.contracts.token,
        voterA.address,
        lowBalanceWallet.address,
        VOTER_ALLOCATION
      );
      expect(verifiedVotes.voterAVotes).to.equal(VOTER_ALLOCATION);
      expect(verifiedVotes.voterBVotes).to.equal(VOTER_ALLOCATION);
    });
  });

  describe("3 & 4. Full 2-Wallet DAO Lifecycle via GovernorStorage & Guardian Emergency Cancel", function () {
    let core, contracts, addresses;
    const VOTING_DELAY = 1;
    const VOTING_PERIOD = 12;
    const TIMELOCK_DELAY = 3600;

    beforeEach(async function () {
      core = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        votingDelay: VOTING_DELAY,
        votingPeriod: VOTING_PERIOD,
        proposalThreshold: ethers.parseEther("10000"),
        quorumPercent: 4, // 400,000 UTP quorum -> requires BOTH voterA (250k) and voterB (250k)
        timelockMinDelay: TIMELOCK_DELAY,
        guardian: guardian.address,
      });
      contracts = core.contracts;
      addresses = core.addresses;

      await distributeAndVerify({
        token: contracts.token,
        deployer,
        voterA: voterA.address,
        voterB: voterB.address,
        guardian: guardian.address,
        timelockAddress: addresses.UtPTimelock,
      });

      await (await contracts.token.connect(voterA).delegate(voterA.address)).wait();
      await (await contracts.token.connect(voterB).delegate(voterB.address)).wait();
      await mine(1);

      await assertPreProposalDelegation(
        contracts.token,
        voterA.address,
        voterB.address,
        VOTER_ALLOCATION
      );
    });

    it("executes Proposal #1 via GovernorStorage (eth_call only, zero event logs) to update AppConfig, and blocks direct writes", async function () {
      const bannerKey = ethers.id("civic.banner");

      // Direct writes from deployer, voterA, or guardian revert with OwnableUnauthorizedAccount
      await expect(
        contracts.appConfig.connect(deployer).setConfig(bannerKey, "tampered")
      ).to.be.revertedWithCustomError(contracts.appConfig, "OwnableUnauthorizedAccount");
      await expect(
        contracts.appConfig.connect(voterA).setConfig(bannerKey, "tampered")
      ).to.be.revertedWithCustomError(contracts.appConfig, "OwnableUnauthorizedAccount");

      expect(await contracts.governance.proposalCount()).to.equal(0n);

      const setConfigData = contracts.appConfig.interface.encodeFunctionData("setConfig", [
        bannerKey,
        "approved-by-dao",
      ]);
      const description = "DIP-1: Set civic.banner to approved-by-dao";

      await (
        await contracts.governance
          .connect(voterA)
          .propose([addresses.AppConfig], [0n], [setConfigData], description)
      ).wait();

      // Enumerate strictly via GovernorStorage eth_call (no eth_getLogs / receipt events)
      expect(await contracts.governance.proposalCount()).to.equal(1n);
      const [proposalId, targets, values, calldatas, descriptionHash] =
        await contracts.governance.proposalDetailsAt(0n);

      expect(targets).to.deep.equal([addresses.AppConfig]);
      expect(values).to.deep.equal([0n]);
      expect(calldatas).to.deep.equal([setConfigData]);
      expect(descriptionHash).to.equal(ethers.id(description));
      expect(await contracts.governance.state(proposalId)).to.equal(STATE.Pending);

      await mine(VOTING_DELAY + 1);
      expect(await contracts.governance.state(proposalId)).to.equal(STATE.Active);

      // Both voterA (250k) and voterB (250k) vote FOR -> 500k >= 400k quorum
      await (await contracts.governance.connect(voterA).castVote(proposalId, FOR)).wait();
      await (await contracts.governance.connect(voterB).castVote(proposalId, FOR)).wait();

      await mine(VOTING_PERIOD);
      expect(await contracts.governance.state(proposalId)).to.equal(STATE.Succeeded);

      // Queue & execute using stored proposalId overload from GovernorStorage
      await (await contracts.governance["queue(uint256)"](proposalId)).wait();
      expect(await contracts.governance.state(proposalId)).to.equal(STATE.Queued);

      await time.increase(TIMELOCK_DELAY);
      await expect(contracts.governance.connect(outsider)["execute(uint256)"](proposalId))
        .to.emit(contracts.appConfig, "ConfigSet")
        .withArgs(bannerKey, "approved-by-dao", addresses.UtPTimelock);

      expect(await contracts.governance.state(proposalId)).to.equal(STATE.Executed);
      expect(await contracts.appConfig.getConfig(bannerKey)).to.equal("approved-by-dao");
    });

    it("allows non-deployer guardian to cancel queued Proposal #2 in UtPTimelock while rejecting deployer cancellation", async function () {
      const bannerKey = ethers.id("civic.banner");

      // Proposal #1 sets baseline config
      const call1 = contracts.appConfig.interface.encodeFunctionData("setConfig", [
        bannerKey,
        "approved-by-dao",
      ]);
      await (
        await contracts.governance
          .connect(voterA)
          .propose([addresses.AppConfig], [0n], [call1], "Proposal #1")
      ).wait();
      const [id1] = await contracts.governance.proposalDetailsAt(0n);
      await mine(VOTING_DELAY + 1);
      await (await contracts.governance.connect(voterA).castVote(id1, FOR)).wait();
      await (await contracts.governance.connect(voterB).castVote(id1, FOR)).wait();
      await mine(VOTING_PERIOD);
      await (await contracts.governance["queue(uint256)"](id1)).wait();
      await time.increase(TIMELOCK_DELAY);
      await (await contracts.governance["execute(uint256)"](id1)).wait();
      expect(await contracts.appConfig.getConfig(bannerKey)).to.equal("approved-by-dao");

      // Proposal #2: malicious/emergency-vetoed update
      const call2 = contracts.appConfig.interface.encodeFunctionData("setConfig", [
        bannerKey,
        "compromised-banner",
      ]);
      const desc2 = "Proposal #2: Compromised update";
      await (
        await contracts.governance
          .connect(voterA)
          .propose([addresses.AppConfig], [0n], [call2], desc2)
      ).wait();

      expect(await contracts.governance.proposalCount()).to.equal(2n);
      const [id2, targets2, values2, calldatas2, descHash2] =
        await contracts.governance.proposalDetailsAt(1n);

      await mine(VOTING_DELAY + 1);
      await (await contracts.governance.connect(voterA).castVote(id2, FOR)).wait();
      await (await contracts.governance.connect(voterB).castVote(id2, FOR)).wait();
      await mine(VOTING_PERIOD);
      expect(await contracts.governance.state(id2)).to.equal(STATE.Succeeded);

      await (await contracts.governance["queue(uint256)"](id2)).wait();
      expect(await contracts.governance.state(id2)).to.equal(STATE.Queued);

      // Compute OZ GovernorTimelockControl salt: bytes20(governor) ^ descriptionHash
      const govLeftAligned = ethers.concat([
        addresses.GovernancePlugin,
        new Uint8Array(12),
      ]);
      const timelockSalt = ethers.toBeHex(
        BigInt(govLeftAligned) ^ BigInt(descHash2),
        32
      );
      const operationId = await contracts.timelock.hashOperationBatch(
        [...targets2],
        [...values2],
        [...calldatas2],
        ethers.ZeroHash,
        timelockSalt
      );
      expect(await contracts.timelock.isOperationPending(operationId)).to.equal(true);

      // Deployer has zero timelock privileges -> cancel MUST revert
      await expect(
        contracts.timelock.connect(deployer).cancel(operationId)
      ).to.be.reverted;

      // Non-deployer guardian holds CANCELLER_ROLE -> cancels queued timelock operation
      await (await contracts.timelock.connect(guardian).cancel(operationId)).wait();

      expect(await contracts.timelock.isOperationPending(operationId)).to.equal(false);
      expect(await contracts.governance.state(id2)).to.equal(STATE.Canceled);

      // Even after timelock delay elapses, execution reverts and AppConfig stays intact
      await time.increase(TIMELOCK_DELAY);
      await expect(contracts.governance["execute(uint256)"](id2)).to.be.reverted;
      expect(await contracts.appConfig.getConfig(bannerKey)).to.equal("approved-by-dao");
    });

    it("executes a 3-wallet proposal (250k + 200k + 50k = 500k >= 400k quorum) through UtPTimelock", async function () {
      const threeWayCore = await deployCore(ethers, deployer, {
        initialSupply: ethers.parseEther("10000000"),
        votingDelay: VOTING_DELAY,
        votingPeriod: VOTING_PERIOD,
        proposalThreshold: ethers.parseEther("10000"),
        quorumPercent: 4,
        timelockMinDelay: TIMELOCK_DELAY,
        guardian: guardian.address,
      });
      const c = threeWayCore.contracts;
      const a = threeWayCore.addresses;

      await distributeAndVerify({
        token: c.token,
        deployer,
        voterA: voterA.address,
        voterB: voterB.address,
        voterC: outsider.address,
        guardian: guardian.address,
        timelockAddress: a.UtPTimelock,
      });

      await (await c.token.connect(voterA).delegate(voterA.address)).wait();
      await (await c.token.connect(voterB).delegate(voterB.address)).wait();
      await (await c.token.connect(outsider).delegate(outsider.address)).wait();
      await mine(1);

      await assertPreProposalDelegation(
        c.token,
        voterA.address,
        voterB.address,
        undefined,
        outsider.address
      );

      const bannerKey = ethers.id("banner");
      const calldata = c.appConfig.interface.encodeFunctionData("setConfig", [
        bannerKey,
        "alpha-accepted",
      ]);
      await (
        await c.governance
          .connect(voterA)
          .propose([a.AppConfig], [0n], [calldata], "Proposal #1: Alpha acceptance banner")
      ).wait();

      const [proposalId] = await c.governance.proposalDetailsAt(0n);
      await mine(VOTING_DELAY + 1);

      await (await c.governance.connect(voterA).castVote(proposalId, FOR)).wait();
      await (await c.governance.connect(voterB).castVote(proposalId, FOR)).wait();
      await (await c.governance.connect(outsider).castVote(proposalId, FOR)).wait();
      await mine(VOTING_PERIOD);

      expect(await c.governance.state(proposalId)).to.equal(STATE.Succeeded);
      await (await c.governance["queue(uint256)"](proposalId)).wait();
      await time.increase(TIMELOCK_DELAY);
      await (await c.governance["execute(uint256)"](proposalId)).wait();

      expect(await c.appConfig.getConfig(bannerKey)).to.equal("alpha-accepted");
    });
  });
});
