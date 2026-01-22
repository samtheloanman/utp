// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PermissionManager.sol";

/**
 * @title DAO
 * @dev The core kernel of the Bitcoin DAO Framework. 
 * It manages permissions and serves as the canonical identity for the organization.
 */
contract DAO is PermissionManager {
    /// @notice Permission ID required to execute actions through the DAO.
    bytes32 public constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");

    /**
     * @notice Initializes the DAO with the deployer as the initial ROOT admin.
     */
    constructor() {
        _initializePermission(address(this), msg.sender, ROOT_PERMISSION_ID);
    }

    /**
     * @notice Executes a batch of calls on behalf of the DAO.
     * @dev Only users/plugins with EXECUTE_PERMISSION can call this.
     * @param targets The target contract addresses.
     * @param values The ETH (RBTC) values to send with the calls.
     * @param callDatas The calldata for each call.
     * @return results The results of each call.
     */
    function execute(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata callDatas
    ) external returns (bytes[] memory results) {
        if (!hasPermission(address(this), msg.sender, EXECUTE_PERMISSION_ID)) {
            revert AccessDenied(msg.sender, address(this), EXECUTE_PERMISSION_ID);
        }

        require(targets.length == values.length && targets.length == callDatas.length, "Array length mismatch");
        results = new bytes[](targets.length);

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{value: values[i]}(callDatas[i]);
            require(success, "DAO execution failed");
            results[i] = result;
        }
    }

    receive() external payable {}
}
