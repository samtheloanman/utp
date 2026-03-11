// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title UBTC
 * @dev BTC-backed stablecoin token. Only the StablecoinController can mint/burn.
 * Controller is set once during initialization.
 */
contract UBTC is ERC20, ERC20Burnable {
    address public controller;
    address public immutable deployer;

    error OnlyController();
    error OnlyDeployer();
    error ControllerAlreadySet();

    modifier onlyController() {
        if (msg.sender != controller) revert OnlyController();
        _;
    }

    constructor() ERC20("UTP Bitcoin Dollar", "UBTC") {
        deployer = msg.sender;
    }

    /**
     * @notice Sets the controller address. Can only be called once by the deployer.
     */
    function setController(address _controller) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (controller != address(0)) revert ControllerAlreadySet();
        controller = _controller;
    }

    function mint(address to, uint256 amount) external onlyController {
        _mint(to, amount);
    }

    function controllerBurn(address from, uint256 amount) external onlyController {
        _burn(from, amount);
    }
}
