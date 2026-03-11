// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

import "../core/DAO.sol";

/**
 * @title UTPToken
 * @dev Governance token for the Universal Transaction Protocol.
 * - ERC-20 with ERC20Votes for on-chain governance weight
 * - ERC20Permit for gasless approvals
 * - Burnable for deflationary mechanics
 * - Minting gated by DAO permission (MINTER_PERMISSION_ID)
 * - Max supply cap enforced
 */
contract UTPToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes {
    DAO public immutable dao;

    /// @notice Maximum token supply (1 billion tokens with 18 decimals).
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Permission ID required to mint new tokens.
    bytes32 public constant MINTER_PERMISSION_ID = keccak256("MINTER_PERMISSION");

    error Unauthorized();
    error ExceedsMaxSupply();

    /**
     * @notice Initializes the UTP token.
     * @param _dao The DAO address that governs minting.
     * @param _initialHolder Address to receive initial treasury allocation.
     * @param _initialSupply Initial tokens to mint (must be <= MAX_SUPPLY).
     */
    constructor(
        address _dao,
        address _initialHolder,
        uint256 _initialSupply
    ) ERC20("Universal Transaction Protocol", "UTP") ERC20Permit("Universal Transaction Protocol") {
        if (_initialSupply > MAX_SUPPLY) revert ExceedsMaxSupply();
        dao = DAO(payable(_dao));
        if (_initialSupply > 0) {
            _mint(_initialHolder, _initialSupply);
        }
    }

    /**
     * @notice Mints new tokens. Only callable by addresses with MINTER_PERMISSION.
     * @param to Recipient of minted tokens.
     * @param amount Number of tokens to mint.
     */
    function mint(address to, uint256 amount) external {
        if (!dao.hasPermission(address(this), msg.sender, MINTER_PERMISSION_ID)) {
            revert Unauthorized();
        }
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        _mint(to, amount);
    }

    // ---- Required overrides for ERC20Votes + ERC20 ----

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
