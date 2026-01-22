// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DAO.sol";

/**
 * @title PluginRegistry
 * @dev Manages the lifecycle of plugins within a DAO.
 * Handles installation, uninstallation, and permission setup.
 */
contract PluginRegistry {
    struct Plugin {
        uint256 index;
        bool active;
    }

    /// @notice The DAO associated with this registry.
    DAO public immutable dao;

    /// @notice Mapping from plugin address to plugin metadata.
    mapping(address => Plugin) public plugins;
    
    /// @notice List of all plugin addresses.
    address[] public pluginList;

    event PluginInstalled(address indexed plugin);
    event PluginUninstalled(address indexed plugin);

    error PluginAlreadyInstalled(address plugin);
    error PluginNotInstalled(address plugin);
    error Unauthorized();

    /**
     * @notice Initializes the registry for a specific DAO.
     * @param _dao The address of the DAO.
     */
    constructor(address _dao) {
        dao = DAO(payable(_dao));
    }

    /**
     * @notice Installs a new plugin.
     * @dev Only users with ROOT_PERMISSION on the DAO can install plugins.
     * @param plugin The address of the plugin.
     */
    function installPlugin(address plugin) external {
        if (!dao.hasPermission(address(dao), msg.sender, dao.ROOT_PERMISSION_ID())) {
            revert Unauthorized();
        }
        if (plugins[plugin].active) {
            revert PluginAlreadyInstalled(plugin);
        }

        plugins[plugin] = Plugin({
            index: pluginList.length,
            active: true
        });
        pluginList.push(plugin);

        emit PluginInstalled(plugin);
    }

    /**
     * @notice Uninstalls a plugin.
     * @dev Only users with ROOT_PERMISSION on the DAO can uninstall plugins.
     * @param plugin The address of the plugin.
     */
    function uninstallPlugin(address plugin) external {
        if (!dao.hasPermission(address(dao), msg.sender, dao.ROOT_PERMISSION_ID())) {
            revert Unauthorized();
        }
        if (!plugins[plugin].active) {
            revert PluginNotInstalled(plugin);
        }

        uint256 index = plugins[plugin].index;
        address lastPlugin = pluginList[pluginList.length - 1];

        pluginList[index] = lastPlugin;
        plugins[lastPlugin].index = index;
        
        pluginList.pop();
        delete plugins[plugin];

        emit PluginUninstalled(plugin);
    }

    /**
     * @notice Returns the total number of installed plugins.
     */
    function pluginCount() external view returns (uint256) {
        return pluginList.length;
    }
}
