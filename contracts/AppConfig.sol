// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AppConfig
 * @notice Timelock-governed key-value configuration store for UTP civic parameters.
 * @dev Initialized with `UtPTimelock` as `initialOwner` so only passed DAO proposals can mutate entries.
 */
contract AppConfig is Ownable {
    mapping(bytes32 => string) private _entries;

    event ConfigSet(bytes32 indexed key, string value, address indexed executor);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setConfig(bytes32 key, string calldata value) external onlyOwner {
        _entries[key] = value;
        emit ConfigSet(key, value, _msgSender());
    }

    function getConfig(bytes32 key) external view returns (string memory) {
        return _entries[key];
    }
}
