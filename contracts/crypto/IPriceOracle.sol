// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPriceOracle
 * @dev Interface for BTC/USD price feeds.
 */
interface IPriceOracle {
    /// @notice Returns the latest BTC price in USD with 8 decimals (e.g., 6500000000000 = $65,000).
    function getPrice() external view returns (uint256);

    /// @notice Returns the number of decimals in the price.
    function decimals() external pure returns (uint8);

    /// @notice Returns the timestamp of the last price update.
    function lastUpdated() external view returns (uint256);
}
