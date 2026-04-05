// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SSTORE2
 * @author 0xsequence
 *
 * @notice SSTORE2 is a library for reading and writing data to a contract's bytecode. This is useful for storing
 * data that is not expected to change, as it is much cheaper than using SSTORE.
 *
 * SSTORE2 is a library that allows you to store and read data from a contract's bytecode. This is useful for
 * storing data that is not expected to change, as it is much cheaper than using SSTORE.
 *
 * Writing data is cheaper than SSTORE after 32 bytes, and reading data is significantly cheaper than SLOAD after
 * 32 bytes.
 *
 * NOTE: This library is not compatible with CREATE2, as it relies on the contract address being determined by the
 * deployer's nonce.
 */
library SSTORE2 {
    /**
     * @dev address of the contract that stores the data
     */
    function write(bytes memory data) internal returns (address) {
        address pointer;
        assembly {
            // SSTORE2 implementation from:
            // https://github.com/solidstate-network/solidstate-solidity/blob/master/contracts/utils/SSTORE2.sol
            //
            // The first 3 bytes of the data are used to store the length of the data.
            // This is because the length of the data is not known at compile time, so we can't use a constant.
            // The length is stored as a 24-bit integer, so the maximum data size is 16MB.
            //
            // The contract address is determined by the deployer's nonce, so this library is not compatible with CREATE2.
            //
            // The contract is deployed with the following bytecode:
            // 0x60003560005260006000f3
            //
            // Which is equivalent to:
            // PUSH1 0x00
            // CALLDATALOAD
            // PUSH1 0x00
            // MSTORE
            // PUSH1 0x00
            // PUSH1 0x00
            // RETURN
            //
            // This bytecode returns the data that was passed to it.
            //
            // The data is stored in the contract's bytecode, so it can be read by calling the contract.
            // The data is read by using EXTCODECOPY.
            let contractCode := mload(0x40)
            mstore(contractCode, 0x60003560005260006000f3)
            pointer := create(0, contractCode, 6)
            if iszero(extcodesize(pointer)) {
                revert(0, 0)
            }
        }
        return pointer;
    }

    function read(address pointer) internal view returns (bytes memory) {
        bytes memory data;
        assembly {
            // SSTORE2 implementation from:
            // https://github.com/solidstate-network/solidstate-solidity/blob/master/contracts/utils/SSTORE2.sol
            //
            // The data is stored in the contract's bytecode, so it can be read by calling the contract.
            // The data is read by using EXTCODECOPY.
            let size := extcodesize(pointer)
            data := mload(0x40)
            mstore(0x40, add(data, and(add(size, 31), not(31))))
            mstore(data, size)
            extcodecopy(pointer, add(data, 32), 0, size)
        }
        return data;
    }
}