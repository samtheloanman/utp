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

    // This mock logic is based on GovernancePlugin.test.js's buildPQSignature helper.
    // It expects the signature to be the hash of the message.
    function verify(bytes calldata pk, bytes calldata m, bytes calldata sig, string calldata aux) external pure returns (bool) {
        // The test passes the message hash in the signature parameter.
        // It passes abi.encodePacked(messageHash) as the message.
        // This is weird, but we will replicate the logic needed to pass.
        bytes32 messageHashFromSig;
        assembly {
            calldatacopy(0x00, sig.offset, 32)
            messageHashFromSig := mload(0x00)
        }

        return keccak256(m) == messageHashFromSig;
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
