// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/DAO.sol";

/**
 * @title Treasury
 * @dev A simple vault for holding DAO assets.
 * All withdrawals must be authorized by the DAO kernel.
 */
contract Treasury {
    DAO public immutable dao;

    event FundsWithdrawn(address indexed to, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed to, uint256 amount);

    error Unauthorized();

    modifier onlyDAO() {
        if (msg.sender != address(dao)) revert Unauthorized();
        _;
    }

    /**
     * @notice Initializes the treasury for a DAO.
     * @param _dao The address of the DAO kernel.
     */
    constructor(address _dao) {
        dao = DAO(payable(_dao));
    }

    /**
     * @notice Withdraws native assets (RBTC).
     * @param to The recipient address.
     * @param amount The amount to withdraw.
     */
    function withdraw(address payable to, uint256 amount) external onlyDAO {
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(to, amount);
    }

    /**
     * @notice Withdraws ERC20 tokens.
     * @param token The token address.
     * @param to The recipient address.
     * @param amount The amount to withdraw.
     */
    function withdrawERC20(address token, address to, uint256 amount) external onlyDAO {
        // low-level call to support tokens that don't return bool
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        emit ERC20Withdrawn(token, to, amount);
    }

    receive() external payable {}
}
