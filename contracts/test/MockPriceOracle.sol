// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPriceOracle} from "../crypto/IPriceOracle.sol";

/**
 * @title MockPriceOracle
 * @dev TEST ONLY. BTC/USD price with 8 decimals; defaults to $65,000.
 *      Never deploy outside local networks (scripts/deploy.cjs enforces this).
 */
contract MockPriceOracle is IPriceOracle {
    uint256 private _price = 65_000 * 1e8;
    uint256 private _lastUpdated;

    event PriceSet(uint256 price, uint256 timestamp);

    constructor() {
        _lastUpdated = block.timestamp;
    }

    function getPrice() external view returns (uint256) {
        return _price;
    }

    function lastUpdated() external view returns (uint256) {
        return _lastUpdated;
    }

    /// @notice Sets the price and refreshes the timestamp.
    function setPrice(uint256 newPrice) external {
        _price = newPrice;
        _lastUpdated = block.timestamp;
        emit PriceSet(newPrice, block.timestamp);
    }

    /// @notice Sets lastUpdated directly, for staleness tests.
    function setLastUpdated(uint256 timestamp) external {
        _lastUpdated = timestamp;
    }
}
