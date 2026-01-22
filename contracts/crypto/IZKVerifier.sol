// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IZKVerifier
 * @dev Interface for Zero-Knowledge (ZK) proof verification.
 * Used for anonymous membership and private voting verification.
 */
interface IZKVerifier {
    /**
     * @notice Verifies a zero-knowledge proof.
     * @param proof The zk-SNARK/STARK proof data.
     * @param publicInputs The public inputs associated with the proof.
     * @return bool True if the proof is valid, false otherwise.
     */
    function verify(
        bytes memory proof,
        bytes32[] memory publicInputs
    ) external view returns (bool);

    /**
     * @notice Returns the type of ZK system used by this verifier.
     * @return string The ZK system type (e.g., "Groth16", "Plonk", "STARK").
     */
    function zkType() external pure returns (string memory);
}
