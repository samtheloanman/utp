// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IPriceOracle.sol";

/**
 * @title MockPriceOracle
 * @dev Test oracle with settable BTC/USD price. Default: $65,000.
 *      Tracks lastUpdated timestamp for staleness checks.
 */
contract MockPriceOracle is IPriceOracle {
    uint256 public price;
    uint256 public lastUpdated;

    constructor() {
        price = 65_000 * 10 ** 8; // $65,000 with 8 decimals
        lastUpdated = block.timestamp;
    }

    function setPrice(uint256 _price) external {
        price = _price;
        lastUpdated = block.timestamp;
    }

    function getPrice() external view override returns (uint256) {
        return price;
    }

    function decimals() external pure override returns (uint8) {
        return 8;
    }
}
