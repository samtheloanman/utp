// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title UtPTimelock
 * @notice The DAO's only executor. Holds ROOT on the DAO; GovernancePlugin is its proposer.
 * @dev Thin wrapper over OpenZeppelin's audited TimelockController so it gets a project artifact.
 *      Pass admin = address(0) so the timelock administers itself (no external admin).
 */
contract UtPTimelock is TimelockController {
    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin)
        TimelockController(minDelay, proposers, executors, admin)
    {}
}
