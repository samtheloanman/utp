// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IQuantumVerifier
 * @dev Interface for Post-Quantum (PQ) signature verification.
 * This allows the DAO to be "crypto-agile", swapping algorithms as NIST standards evolve.
 */
interface IQuantumVerifier {
    /**
     * @notice Verifies a post-quantum signature against a public key and message.
     * @param publicKey The PQ public key corresponding to the signer.
     * @param messageHash The hash of the message that was signed.
     * @param signature The PQ signature to verify.
     * @return bool True if the signature is valid, false otherwise.
     */
    function verify(
        bytes memory publicKey,
        bytes32 messageHash,
        bytes memory signature
    ) external view returns (bool);

    /**
     * @notice Returns the name of the post-quantum algorithm used by this verifier.
     * @return string The algorithm name (e.g., "Dilithium5", "SPHINCS+").
     */
    function algorithm() external pure returns (string memory);
}
