// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ZKNOX_ethdilithium
 * @dev Dummy interface created to fix a blocking compilation error.
 * The original file was missing from the project.
 */
interface ZKNOX_ethdilithium {
    function verify(bytes calldata pk, bytes calldata m, bytes calldata sig, string calldata aux) external view returns (bool);
}
