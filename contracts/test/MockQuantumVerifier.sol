// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../crypto/dilithium/ZKNOX_ethdilithium.sol";

/**
 * @title MockQuantumVerifier
 * @dev Mock implementation of a Post-Quantum signature verifier.
 * This file was created to fix a blocking compilation error.
 */
contract MockQuantumVerifier {
    function algorithm() public pure returns (string memory) {
        return "MockDilithium";
    }

    /// @dev Mirrors GovernancePlugin's message format: `m` is abi.encodePacked(messageHash).
    ///      A "valid" mock signature is that same 32-byte hash. Signatures shorter than
    ///      32 bytes are rejected (PQ downgrade-attack test).
    function verify(bytes calldata, bytes calldata m, bytes calldata sig, string calldata) external pure returns (bool) {
        if (sig.length < 32 || m.length != 32) {
            return false;
        }
        return bytes32(sig[0:32]) == bytes32(m[0:32]);
    }

    // Overloaded function for MockVerifiers.test.js
    function verify(bytes calldata publicKey, bytes calldata message, bytes calldata signature) public pure returns (bool) {
        if (signature.length < 32) {
            return false;
        }

        bytes32 messageHash;
        assembly {
            calldatacopy(0x00, message.offset, 32)
            messageHash := mload(0x00)
        }

        bytes32 sigHash;
        assembly {
            calldatacopy(0x00, signature.offset, 32)
            sigHash := mload(0x00)
        }
        return messageHash == sigHash;
    }
}
