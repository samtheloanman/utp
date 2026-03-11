import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("EventMarket", function () {
    let dao, utpToken, eventMarket;
    let owner, creator, resolver, voter1, voter2, voter3, unauthorized;
    const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M
    const STAKE_AMOUNT = ethers.parseEther("1000");

    beforeEach(async function () {
        [owner, creator, resolver, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();

        // Deploy DAO
        const DAO = await ethers.getContractFactory("DAO");
        dao = await DAO.deploy();

        // Deploy UTP Token
        const UTPToken = await ethers.getContractFactory("UTPToken");
        utpToken = await UTPToken.deploy(await dao.getAddress(), owner.address, INITIAL_SUPPLY);

        // Deploy EventMarket
        const EventMarket = await ethers.getContractFactory("EventMarket");
        eventMarket = await EventMarket.deploy(await dao.getAddress(), await utpToken.getAddress());

        // Grant event creation and resolution permissions
        const CREATE_PERM = await eventMarket.CREATE_EVENT_PERMISSION_ID();
        const RESOLVE_PERM = await eventMarket.RESOLVE_EVENT_PERMISSION_ID();
        await dao.grant(await eventMarket.getAddress(), creator.address, CREATE_PERM);
        await dao.grant(await eventMarket.getAddress(), resolver.address, RESOLVE_PERM);

        // Distribute tokens to voters
        await utpToken.transfer(voter1.address, ethers.parseEther("10000"));
        await utpToken.transfer(voter2.address, ethers.parseEther("10000"));
        await utpToken.transfer(voter3.address, ethers.parseEther("10000"));

        // Approve EventMarket to spend voter tokens
        await utpToken.connect(voter1).approve(await eventMarket.getAddress(), ethers.MaxUint256);
        await utpToken.connect(voter2).approve(await eventMarket.getAddress(), ethers.MaxUint256);
        await utpToken.connect(voter3).approve(await eventMarket.getAddress(), ethers.MaxUint256);
    });

    // Helper: create a standard event (2 options, 1 hour deadline)
    async function createStandardEvent() {
        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
        await eventMarket.connect(creator).createEvent(
            "Will US pass the Stablecoin Act?",
            "US",
            2,
            deadline
        );
        return 0; // eventId
    }

    describe("Deployment", function () {
        it("Should set the correct DAO address", async function () {
            expect(await eventMarket.dao()).to.equal(await dao.getAddress());
        });

        it("Should set the correct staking token", async function () {
            expect(await eventMarket.stakingToken()).to.equal(await utpToken.getAddress());
        });

        it("Should start with zero events", async function () {
            expect(await eventMarket.eventCount()).to.equal(0);
        });
    });

    describe("Event Creation", function () {
        it("Should allow authorized creator to create events", async function () {
            const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
            await expect(
                eventMarket.connect(creator).createEvent("Test event", "GLOBAL", 3, deadline)
            ).to.emit(eventMarket, "EventCreated");

            expect(await eventMarket.eventCount()).to.equal(1);
        });

        it("Should reject unauthorized event creation", async function () {
            const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
            await expect(
                eventMarket.connect(unauthorized).createEvent("Test", "US", 2, deadline)
            ).to.be.revertedWithCustomError(eventMarket, "Unauthorized");
        });

        it("Should reject events with less than 2 options", async function () {
            const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
            await expect(
                eventMarket.connect(creator).createEvent("Test", "US", 1, deadline)
            ).to.be.revertedWith("Min 2 options");
        });

        it("Should store event data correctly", async function () {
            const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
            await eventMarket.connect(creator).createEvent(
                "EU Digital Markets Act vote", "EU", 4, deadline
            );

            const event = await eventMarket.events(0);
            expect(event.description).to.equal("EU Digital Markets Act vote");
            expect(event.regionTag).to.equal("EU");
            expect(event.numOptions).to.equal(4);
            expect(event.deadline).to.equal(deadline);
            expect(event.resolved).to.be.false;
            expect(event.cancelled).to.be.false;
        });

        it("Should assign sequential event IDs", async function () {
            const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
            await eventMarket.connect(creator).createEvent("Event 1", "US", 2, deadline);
            await eventMarket.connect(creator).createEvent("Event 2", "EU", 3, deadline);
            expect(await eventMarket.eventCount()).to.equal(2);
        });
    });

    describe("Staking Votes", function () {
        let eventId;

        beforeEach(async function () {
            eventId = await createStandardEvent();
        });

        it("Should allow staking on an option", async function () {
            await expect(
                eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT)
            ).to.emit(eventMarket, "VoteStaked")
                .withArgs(eventId, voter1.address, 0, STAKE_AMOUNT);
        });

        it("Should transfer tokens from voter to contract", async function () {
            const balanceBefore = await utpToken.balanceOf(voter1.address);
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            const balanceAfter = await utpToken.balanceOf(voter1.address);
            expect(balanceBefore - balanceAfter).to.equal(STAKE_AMOUNT);
        });

        it("Should track individual stakes correctly", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            expect(await eventMarket.getUserStake(eventId, voter1.address, 0)).to.equal(STAKE_AMOUNT);
        });

        it("Should track total stakes per option", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(voter2).stakeVote(eventId, 0, STAKE_AMOUNT);
            expect(await eventMarket.optionStakes(eventId, 0)).to.equal(STAKE_AMOUNT * 2n);
        });

        it("Should allow staking on multiple options", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(voter1).stakeVote(eventId, 1, STAKE_AMOUNT);

            expect(await eventMarket.getUserStake(eventId, voter1.address, 0)).to.equal(STAKE_AMOUNT);
            expect(await eventMarket.getUserStake(eventId, voter1.address, 1)).to.equal(STAKE_AMOUNT);
        });

        it("Should reject invalid option index", async function () {
            await expect(
                eventMarket.connect(voter1).stakeVote(eventId, 5, STAKE_AMOUNT) // Only 2 options (0,1)
            ).to.be.revertedWithCustomError(eventMarket, "InvalidOption");
        });

        it("Should reject zero amount", async function () {
            await expect(
                eventMarket.connect(voter1).stakeVote(eventId, 0, 0)
            ).to.be.revertedWithCustomError(eventMarket, "ZeroAmount");
        });

        it("Should reject staking on resolved event", async function () {
            // Resolve immediately
            await eventMarket.connect(resolver).resolveEvent(eventId, 0);
            await expect(
                eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT)
            ).to.be.revertedWithCustomError(eventMarket, "EventAlreadyResolved");
        });
    });

    describe("Event Resolution", function () {
        let eventId;

        beforeEach(async function () {
            eventId = await createStandardEvent();
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(voter2).stakeVote(eventId, 1, STAKE_AMOUNT);
        });

        it("Should allow authorized resolver to resolve", async function () {
            await expect(
                eventMarket.connect(resolver).resolveEvent(eventId, 0)
            ).to.emit(eventMarket, "EventResolved")
                .withArgs(eventId, 0);
        });

        it("Should reject unauthorized resolution", async function () {
            await expect(
                eventMarket.connect(unauthorized).resolveEvent(eventId, 0)
            ).to.be.revertedWithCustomError(eventMarket, "Unauthorized");
        });

        it("Should reject double resolution", async function () {
            await eventMarket.connect(resolver).resolveEvent(eventId, 0);
            await expect(
                eventMarket.connect(resolver).resolveEvent(eventId, 1)
            ).to.be.revertedWithCustomError(eventMarket, "EventAlreadyResolved");
        });

        it("Should reject invalid winning option", async function () {
            await expect(
                eventMarket.connect(resolver).resolveEvent(eventId, 5)
            ).to.be.revertedWithCustomError(eventMarket, "InvalidOption");
        });
    });

    describe("Reward Claims", function () {
        let eventId;

        beforeEach(async function () {
            eventId = await createStandardEvent();
        });

        it("Should pay winner the full pool when only one side", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(resolver).resolveEvent(eventId, 0);

            const balanceBefore = await utpToken.balanceOf(voter1.address);
            await eventMarket.connect(voter1).claimRewards(eventId);
            const balanceAfter = await utpToken.balanceOf(voter1.address);

            // Winner gets back their own stake (only stake in pool)
            expect(balanceAfter - balanceBefore).to.equal(STAKE_AMOUNT);
        });

        it("Should distribute proportional rewards to winners", async function () {
            // voter1 stakes 1000 on option 0
            // voter2 stakes 2000 on option 0
            // voter3 stakes 3000 on option 1 (loser)
            await eventMarket.connect(voter1).stakeVote(eventId, 0, ethers.parseEther("1000"));
            await eventMarket.connect(voter2).stakeVote(eventId, 0, ethers.parseEther("2000"));
            await eventMarket.connect(voter3).stakeVote(eventId, 1, ethers.parseEther("3000"));

            // Total pool = 6000
            // Winning pool (option 0) = 3000
            // voter1 share = (1000/3000) * 6000 = 2000
            // voter2 share = (2000/3000) * 6000 = 4000
            await eventMarket.connect(resolver).resolveEvent(eventId, 0);

            const v1Before = await utpToken.balanceOf(voter1.address);
            await eventMarket.connect(voter1).claimRewards(eventId);
            const v1After = await utpToken.balanceOf(voter1.address);
            expect(v1After - v1Before).to.equal(ethers.parseEther("2000"));

            const v2Before = await utpToken.balanceOf(voter2.address);
            await eventMarket.connect(voter2).claimRewards(eventId);
            const v2After = await utpToken.balanceOf(voter2.address);
            expect(v2After - v2Before).to.equal(ethers.parseEther("4000"));
        });

        it("Should reject claims from losers", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(voter2).stakeVote(eventId, 1, STAKE_AMOUNT);

            await eventMarket.connect(resolver).resolveEvent(eventId, 0);

            // voter2 staked on option 1 (loser)
            await expect(
                eventMarket.connect(voter2).claimRewards(eventId)
            ).to.be.revertedWithCustomError(eventMarket, "NothingToClaim");
        });

        it("Should reject double claims", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(resolver).resolveEvent(eventId, 0);

            await eventMarket.connect(voter1).claimRewards(eventId);
            await expect(
                eventMarket.connect(voter1).claimRewards(eventId)
            ).to.be.revertedWithCustomError(eventMarket, "AlreadyClaimed");
        });

        it("Should reject claims before resolution", async function () {
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await expect(
                eventMarket.connect(voter1).claimRewards(eventId)
            ).to.be.revertedWithCustomError(eventMarket, "EventNotResolved");
        });
    });

    describe("Event Cancellation", function () {
        let eventId;

        beforeEach(async function () {
            eventId = await createStandardEvent();
            await eventMarket.connect(voter1).stakeVote(eventId, 0, STAKE_AMOUNT);
            await eventMarket.connect(voter2).stakeVote(eventId, 1, ethers.parseEther("2000"));
        });

        it("Should allow cancellation by resolver", async function () {
            await expect(
                eventMarket.connect(resolver).cancelEvent(eventId)
            ).to.emit(eventMarket, "EventCancelled")
                .withArgs(eventId);
        });

        it("Should refund full stakes on cancellation", async function () {
            await eventMarket.connect(resolver).cancelEvent(eventId);

            const v1Before = await utpToken.balanceOf(voter1.address);
            await eventMarket.connect(voter1).claimRewards(eventId);
            const v1After = await utpToken.balanceOf(voter1.address);
            expect(v1After - v1Before).to.equal(STAKE_AMOUNT);

            const v2Before = await utpToken.balanceOf(voter2.address);
            await eventMarket.connect(voter2).claimRewards(eventId);
            const v2After = await utpToken.balanceOf(voter2.address);
            expect(v2After - v2Before).to.equal(ethers.parseEther("2000"));
        });

        it("Should reject staking on cancelled event", async function () {
            await eventMarket.connect(resolver).cancelEvent(eventId);
            await expect(
                eventMarket.connect(voter3).stakeVote(eventId, 0, STAKE_AMOUNT)
            ).to.be.revertedWithCustomError(eventMarket, "EventCancelledError");
        });
    });

    describe("Payout Calculation", function () {
        it("Should calculate expected payout correctly", async function () {
            const eventId = await createStandardEvent();

            await eventMarket.connect(voter1).stakeVote(eventId, 0, ethers.parseEther("1000"));
            await eventMarket.connect(voter2).stakeVote(eventId, 1, ethers.parseEther("3000"));

            // If option 0 wins: voter1 gets (1000/1000) * 4000 = 4000
            const payout0 = await eventMarket.calculatePayout(eventId, voter1.address, 0);
            expect(payout0).to.equal(ethers.parseEther("4000"));

            // If option 1 wins: voter2 gets (3000/3000) * 4000 = 4000
            const payout1 = await eventMarket.calculatePayout(eventId, voter2.address, 1);
            expect(payout1).to.equal(ethers.parseEther("4000"));

            // voter1 has no stake on option 1
            const payoutNone = await eventMarket.calculatePayout(eventId, voter1.address, 1);
            expect(payoutNone).to.equal(0);
        });
    });
});
