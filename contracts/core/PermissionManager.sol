// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PermissionManager
 * @dev Manages fine-grained permissions for the DAO ecosystem.
 * Inspired by Aragon OSx, it uses a (where, who, permissionId) pattern.
 */
contract PermissionManager {
    /// @notice Root permission that allows granting/revoking any other permission.
    bytes32 public constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");

    /// @notice Mapping from (where, who, permissionId) to whether the permission is granted.
    mapping(address => mapping(address => mapping(bytes32 => bool))) private _permissions;

    event PermissionGranted(bytes32 indexed permissionId, address indexed who, address indexed where);
    event PermissionRevoked(bytes32 indexed permissionId, address indexed who, address indexed where);

    error AccessDenied(address who, address where, bytes32 permissionId);

    /**
     * @notice Checks if a user has a specific permission at a target contract.
     * @param where The target contract address.
     * @param who The user/plugin address.
     * @param permissionId The ID of the permission.
     * @return bool True if the permission is granted.
     */
    function hasPermission(
        address where,
        address who,
        bytes32 permissionId
    ) public view returns (bool) {
        return _permissions[where][who][permissionId] || _permissions[address(this)][who][ROOT_PERMISSION_ID];
    }

    /**
     * @notice Grants a permission.
     * @dev Only users with ROOT_PERMISSION on this PermissionManager can grant permissions.
     * @param where The target contract address.
     * @param who The user/plugin address to receive the permission.
     * @param permissionId The ID of the permission.
     */
    function grant(
        address where,
        address who,
        bytes32 permissionId
    ) external {
        if (!hasPermission(address(this), msg.sender, ROOT_PERMISSION_ID)) {
            revert AccessDenied(msg.sender, address(this), ROOT_PERMISSION_ID);
        }
        _permissions[where][who][permissionId] = true;
        emit PermissionGranted(permissionId, who, where);
    }

    /**
     * @notice Revokes a permission.
     * @dev Only users with ROOT_PERMISSION on this PermissionManager can revoke permissions.
     * @param where The target contract address.
     * @param who The user/plugin address to lose the permission.
     * @param permissionId The ID of the permission.
     */
    function revoke(
        address where,
        address who,
        bytes32 permissionId
    ) external {
        if (!hasPermission(address(this), msg.sender, ROOT_PERMISSION_ID)) {
            revert AccessDenied(msg.sender, address(this), ROOT_PERMISSION_ID);
        }
        _permissions[where][who][permissionId] = false;
        emit PermissionRevoked(permissionId, who, where);
    }

    /**
     * @notice Internal helper to initialize permissions during DAO setup.
     * @dev This should be used carefully in the constructor of the DAO.
     */
    function _initializePermission(
        address where,
        address who,
        bytes32 permissionId
    ) internal {
        _permissions[where][who][permissionId] = true;
        emit PermissionGranted(permissionId, who, where);
    }
}
