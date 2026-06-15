// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPriceOracle
 * @dev Dummy interface created to fix a blocking compilation error.
 * The original file was missing from the project.
 */
interface IPriceOracle {
    function getPrice() external view returns (uint256);
    function lastUpdated() external view returns (uint256);
}
