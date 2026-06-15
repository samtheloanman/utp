// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IZKVerifier
 * @dev Interface for a Zero-Knowledge proof verifier.
 * This is a placeholder created to fix a blocking compilation error.
 * The original file was missing from the project.
 */
interface IZKVerifier {
    /**
     * @notice Verifies a ZK proof.
     * @param proof The ZK proof.
     * @param publicInputs The public inputs for the proof.
     * @return True if the proof is valid, false otherwise.
     */
    function verify(bytes calldata proof, bytes32[] memory publicInputs) external returns (bool);
}
