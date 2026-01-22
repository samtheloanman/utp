// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IQuantumVerifier.sol";
import "./IZKVerifier.sol";

/**
 * @title MockVerifiers
 * @dev Mock implementations of IQuantumVerifier and IZKVerifier for testing and prototyping.
 * These allow testing the DAO logic without heavy cryptographic dependencies.
 */
contract MockQuantumVerifier is IQuantumVerifier {
    /**
     * @dev Simplistic mock: valid if the signature matches the messageHash padded.
     * In a real scenario, this would be a Dilithium or SPHINCS+ verification.
     */
    function verify(
        bytes memory /* publicKey */,
        bytes32 messageHash,
        bytes memory signature
    ) external pure override returns (bool) {
        // If signature is empty, it's a downgrade attack or missing data
        if (signature.length == 0) return false;
        
        // Mock success condition: first 32 bytes of signature match messageHash
        if (signature.length < 32) return false;
        
        bytes32 sigPart;
        assembly {
            sigPart := mload(add(signature, 32))
        }
        
        return sigPart == messageHash;
    }

    function algorithm() external pure override returns (string memory) {
        return "MockDilithium";
    }
}

contract MockZKVerifier is IZKVerifier {
    /**
     * @dev Simplistic mock: valid if the proof is exactly "valid_proof".
     */
    function verify(
        bytes memory proof,
        bytes32[] memory /* publicInputs */
    ) external pure override returns (bool) {
        return keccak256(proof) == keccak256(abi.encodePacked("valid_proof"));
    }

    function zkType() external pure override returns (string memory) {
        return "MockGroth16";
    }
}
