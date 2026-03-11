import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MockVerifiers", function () {
  let mockQuantumVerifier, mockZKVerifier;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const MockQuantumVerifier = await ethers.getContractFactory("MockQuantumVerifier");
    mockQuantumVerifier = await MockQuantumVerifier.deploy();

    const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
    mockZKVerifier = await MockZKVerifier.deploy();
  });

  describe("MockQuantumVerifier", function () {
    it("Should return the correct algorithm name", async function () {
      expect(await mockQuantumVerifier.algorithm()).to.equal("MockDilithium");
    });

    it("Should verify a valid PQ signature", async function () {
      const messageHash = ethers.solidityPackedKeccak256(["string"], ["test message"]);

      // Create a signature that matches the messageHash (first 32 bytes)
      const signature = ethers.concat([messageHash, "0x1234"]);
      const publicKey = "0x1234";

      const result = await mockQuantumVerifier.verify(publicKey, messageHash, signature);
      expect(result).to.be.true;
    });

    it("Should reject an empty signature (downgrade attack protection)", async function () {
      const messageHash = ethers.solidityPackedKeccak256(["string"], ["test message"]);
      const signature = "0x";
      const publicKey = "0x1234";

      const result = await mockQuantumVerifier.verify(publicKey, messageHash, signature);
      expect(result).to.be.false;
    });

    it("Should reject a signature that is too short", async function () {
      const messageHash = ethers.solidityPackedKeccak256(["string"], ["test message"]);
      const signature = "0x1234"; // Only 2 bytes
      const publicKey = "0x1234";

      const result = await mockQuantumVerifier.verify(publicKey, messageHash, signature);
      expect(result).to.be.false;
    });

    it("Should reject an invalid signature", async function () {
      const messageHash = ethers.solidityPackedKeccak256(["string"], ["test message"]);
      const wrongHash = ethers.solidityPackedKeccak256(["string"], ["wrong message"]);

      // Signature with wrong hash
      const signature = ethers.concat([wrongHash, "0x1234"]);
      const publicKey = "0x1234";

      const result = await mockQuantumVerifier.verify(publicKey, messageHash, signature);
      expect(result).to.be.false;
    });
  });

  describe("MockZKVerifier", function () {
    it("Should return the correct ZK type", async function () {
      expect(await mockZKVerifier.zkType()).to.equal("MockGroth16");
    });

    it("Should verify a valid ZK proof", async function () {
      const validProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
      const publicInputs = [
        ethers.encodeBytes32String("input1"),
        ethers.encodeBytes32String("input2")
      ];

      const result = await mockZKVerifier.verify(validProof, publicInputs);
      expect(result).to.be.true;
    });

    it("Should reject an invalid ZK proof", async function () {
      const invalidProof = ethers.hexlify(ethers.toUtf8Bytes("invalid_proof"));
      const publicInputs = [
        ethers.encodeBytes32String("input1")
      ];

      const result = await mockZKVerifier.verify(invalidProof, publicInputs);
      expect(result).to.be.false;
    });

    it("Should reject an empty proof", async function () {
      const emptyProof = "0x";
      const publicInputs = [ethers.encodeBytes32String("input1")];

      const result = await mockZKVerifier.verify(emptyProof, publicInputs);
      expect(result).to.be.false;
    });
  });
});
