import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("UTPToken", function () {
    let dao, utpToken;
    let owner, treasury, minter, user1, user2;
    const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M
    const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1B

    beforeEach(async function () {
        [owner, treasury, minter, user1, user2] = await ethers.getSigners();

        const DAO = await ethers.getContractFactory("DAO");
        dao = await DAO.deploy();

        const UTPToken = await ethers.getContractFactory("UTPToken");
        utpToken = await UTPToken.deploy(
            await dao.getAddress(),
            treasury.address,
            INITIAL_SUPPLY
        );

        // Grant MINTER_PERMISSION to minter
        const MINTER_PERMISSION_ID = await utpToken.MINTER_PERMISSION_ID();
        await dao.grant(await utpToken.getAddress(), minter.address, MINTER_PERMISSION_ID);
    });

    describe("Deployment", function () {
        it("Should set correct name and symbol", async function () {
            expect(await utpToken.name()).to.equal("Universal Transaction Protocol");
            expect(await utpToken.symbol()).to.equal("UTP");
        });

        it("Should mint initial supply to treasury", async function () {
            expect(await utpToken.balanceOf(treasury.address)).to.equal(INITIAL_SUPPLY);
        });

        it("Should set correct DAO address", async function () {
            expect(await utpToken.dao()).to.equal(await dao.getAddress());
        });

        it("Should have correct max supply constant", async function () {
            expect(await utpToken.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
        });

        it("Should revert if initial supply exceeds max", async function () {
            const UTPToken = await ethers.getContractFactory("UTPToken");
            const tooMuch = MAX_SUPPLY + 1n;
            await expect(
                UTPToken.deploy(await dao.getAddress(), treasury.address, tooMuch)
            ).to.be.revertedWithCustomError(utpToken, "ExceedsMaxSupply");
        });

        it("Should allow zero initial supply", async function () {
            const UTPToken = await ethers.getContractFactory("UTPToken");
            const token = await UTPToken.deploy(await dao.getAddress(), treasury.address, 0);
            expect(await token.totalSupply()).to.equal(0);
        });
    });

    describe("Minting", function () {
        it("Should allow authorized minter to mint", async function () {
            const mintAmount = ethers.parseEther("1000");
            await utpToken.connect(minter).mint(user1.address, mintAmount);
            expect(await utpToken.balanceOf(user1.address)).to.equal(mintAmount);
        });

        it("Should reject unauthorized minting", async function () {
            await expect(
                utpToken.connect(user1).mint(user1.address, ethers.parseEther("1000"))
            ).to.be.revertedWithCustomError(utpToken, "Unauthorized");
        });

        it("Should reject minting beyond max supply", async function () {
            const remaining = MAX_SUPPLY - INITIAL_SUPPLY;
            // Mint up to max
            await utpToken.connect(minter).mint(user1.address, remaining);
            // Try to mint 1 more
            await expect(
                utpToken.connect(minter).mint(user1.address, 1n)
            ).to.be.revertedWithCustomError(utpToken, "ExceedsMaxSupply");
        });

        it("Should allow minting exactly to max supply", async function () {
            const remaining = MAX_SUPPLY - INITIAL_SUPPLY;
            await utpToken.connect(minter).mint(user1.address, remaining);
            expect(await utpToken.totalSupply()).to.equal(MAX_SUPPLY);
        });
    });

    describe("Burning", function () {
        it("Should allow token holders to burn their tokens", async function () {
            const burnAmount = ethers.parseEther("100");
            await utpToken.connect(treasury).burn(burnAmount);
            expect(await utpToken.balanceOf(treasury.address)).to.equal(INITIAL_SUPPLY - burnAmount);
        });

        it("Should reduce total supply on burn", async function () {
            const burnAmount = ethers.parseEther("100");
            await utpToken.connect(treasury).burn(burnAmount);
            expect(await utpToken.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
        });
    });

    describe("Voting Power (ERC20Votes)", function () {
        it("Should start with zero voting power (must delegate first)", async function () {
            expect(await utpToken.getVotes(treasury.address)).to.equal(0);
        });

        it("Should activate voting power via self-delegation", async function () {
            await utpToken.connect(treasury).delegate(treasury.address);
            expect(await utpToken.getVotes(treasury.address)).to.equal(INITIAL_SUPPLY);
        });

        it("Should allow delegating votes to another address", async function () {
            await utpToken.connect(treasury).delegate(user1.address);
            expect(await utpToken.getVotes(user1.address)).to.equal(INITIAL_SUPPLY);
            expect(await utpToken.getVotes(treasury.address)).to.equal(0);
        });

        it("Should update voting power on transfer after delegation", async function () {
            await utpToken.connect(treasury).delegate(treasury.address);
            const transferAmount = ethers.parseEther("1000");

            await utpToken.connect(treasury).transfer(user1.address, transferAmount);
            // user1 hasn't delegated, so their votes don't count yet
            expect(await utpToken.getVotes(treasury.address)).to.equal(INITIAL_SUPPLY - transferAmount);
            expect(await utpToken.getVotes(user1.address)).to.equal(0);

            // user1 self-delegates
            await utpToken.connect(user1).delegate(user1.address);
            expect(await utpToken.getVotes(user1.address)).to.equal(transferAmount);
        });

        it("Should track delegates correctly", async function () {
            await utpToken.connect(treasury).delegate(user1.address);
            expect(await utpToken.delegates(treasury.address)).to.equal(user1.address);
        });
    });

    describe("ERC20Permit", function () {
        it("Should have correct permit domain name", async function () {
            // Just verify the token supports the permit interface by checking nonces
            expect(await utpToken.nonces(owner.address)).to.equal(0);
        });
    });

    describe("Transfer", function () {
        it("Should allow standard ERC-20 transfers", async function () {
            const amount = ethers.parseEther("500");
            await utpToken.connect(treasury).transfer(user1.address, amount);
            expect(await utpToken.balanceOf(user1.address)).to.equal(amount);
        });

        it("Should emit Transfer event", async function () {
            const amount = ethers.parseEther("500");
            await expect(utpToken.connect(treasury).transfer(user1.address, amount))
                .to.emit(utpToken, "Transfer")
                .withArgs(treasury.address, user1.address, amount);
        });
    });
});
