// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../crypto/IZKVerifier.sol";

/**
 * @title MockZKVerifier
 * @dev Mock implementation of IZKVerifier for testing purposes.
 * This file was created to fix a blocking compilation error.
 */
contract MockZKVerifier is IZKVerifier {
    function zkType() public pure returns (string memory) {
        return "MockGroth16";
    }

    function verify(bytes calldata proof, bytes32[] memory publicInputs) external pure override returns (bool) {
        // Simple mock logic: accept if proof is "valid_proof"
        string memory proofStr = string(proof);
        return keccak256(abi.encodePacked(proofStr)) == keccak256(abi.encodePacked("valid_proof"));
    }
}
