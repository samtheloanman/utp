// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DAO} from "../core/DAO.sol";
import {UBTC} from "../tokens/UBTC.sol";
import {IPriceOracle} from "../crypto/IPriceOracle.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StablecoinController
 * @dev Manages the BTC-backed stablecoin (UBTC) with collateral vault mechanics.
 *
 * Users deposit RBTC as collateral → mint UBTC at oracle price.
 * Positions must maintain minimum collateral ratio (default 150%).
 * Undercollateralized positions can be liquidated.
 *
 * All risk parameters are governed by the DAO.
 *
 * Security:
 * - ReentrancyGuard on all functions with external calls
 * - Oracle staleness check (max 1 hour)
 * - CEI pattern followed throughout
 */
contract StablecoinController is ReentrancyGuard {
    struct Position {
        uint256 collateral;  // RBTC deposited (in wei)
        uint256 debt;        // UBTC minted (in wei, 18 decimals)
    }

    DAO public immutable dao;
    UBTC public immutable ubtc;
    IPriceOracle public priceOracle;

    /// @notice Maximum oracle staleness (1 hour)
    uint256 public constant MAX_ORACLE_STALENESS = 1 hours;

    /// @notice Governed parameters
    uint256 public collateralRatioBps;   // e.g., 15000 = 150%
    uint256 public liquidationRatioBps;  // e.g., 12000 = 120%
    uint256 public mintLimitPerDay;
    uint256 public feeBps;
    bool public paused;

    uint256 public dailyMinted;
    uint256 public lastMintDay;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    mapping(address => bool) public hasRole;

    /// @notice Per-user collateral positions
    mapping(address => Position) public positions;

    /// @notice Total RBTC locked as collateral
    uint256 public totalCollateral;

    event Deposit(address indexed user, uint256 rbtcAmount, uint256 ubtcMinted);
    event Redeem(address indexed user, uint256 ubtcBurned, uint256 rbtcReturned);
    event Liquidated(address indexed user, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized);
    event ParameterUpdated(string name, uint256 value);
    event StatusUpdated(bool paused);
    event OracleUpdated(address newOracle);

    error Unauthorized();
    error Paused();
    error ZeroAmount();
    error BelowCollateralRatio();
    error NotLiquidatable();
    error InsufficientDebt();
    error TransferFailed();
    error StaleOracle();

    modifier onlyDAO() {
        if (msg.sender != address(dao)) revert Unauthorized();
        _;
    }

    modifier checkMintLimit(uint256 amount) {
        if (block.timestamp / 1 days != lastMintDay) {
            dailyMinted = 0;
            lastMintDay = block.timestamp / 1 days;
        }
        require(dailyMinted + amount <= mintLimitPerDay, "Exceeds daily mint limit");
        _;
    }

    modifier onlyMinter() {
        if (!hasRole[msg.sender]) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    /**
     * @notice Initializes the controller.
     * @param _dao The DAO address.
     * @param _ubtc The UBTC token address.
     * @param _oracle The price oracle address.
     */
    constructor(address _dao, address _ubtc, address _oracle) {
        dao = DAO(payable(_dao));
        ubtc = UBTC(_ubtc);
        priceOracle = IPriceOracle(_oracle);
        collateralRatioBps = 15000; // 150%
        liquidationRatioBps = 12000; // 120%
        mintLimitPerDay = 1_000_000 * 10 ** 18; // 1M UBTC
        feeBps = 10; // 0.1%
    }

    /**
     * @notice Deposits RBTC collateral and mints UBTC.
     * @param ubtcAmount Amount of UBTC to mint.
     */
    function deposit(uint256 ubtcAmount) external payable whenNotPaused nonReentrant onlyMinter checkMintLimit(ubtcAmount) {
        if (msg.value == 0) revert ZeroAmount();
        if (ubtcAmount == 0) revert ZeroAmount();
        _checkOracleFreshness();

        Position storage pos = positions[msg.sender];
        pos.collateral += msg.value;
        pos.debt += ubtcAmount;
        totalCollateral += msg.value;

        // Check collateral ratio after update
        if (!_isHealthy(msg.sender)) revert BelowCollateralRatio();

        // Mint UBTC to depositor
        ubtc.mint(msg.sender, ubtcAmount);
        dailyMinted += ubtcAmount;

        emit Deposit(msg.sender, msg.value, ubtcAmount);
    }

    /**
     * @notice Redeems UBTC to unlock RBTC collateral.
     * @param ubtcAmount Amount of UBTC to burn.
     */
    function redeem(uint256 ubtcAmount) external whenNotPaused nonReentrant {
        if (ubtcAmount == 0) revert ZeroAmount();

        Position storage pos = positions[msg.sender];
        if (pos.debt < ubtcAmount) revert InsufficientDebt();

        // Calculate proportional collateral to return
        uint256 collateralReturn = (pos.collateral * ubtcAmount) / pos.debt;

        pos.debt -= ubtcAmount;
        pos.collateral -= collateralReturn;
        totalCollateral -= collateralReturn;

        // Burn UBTC from sender
        ubtc.controllerBurn(msg.sender, ubtcAmount);

        // Return RBTC (CEI: state already updated above)
        (bool success, ) = msg.sender.call{value: collateralReturn}("");
        if (!success) revert TransferFailed();

        emit Redeem(msg.sender, ubtcAmount, collateralReturn);
    }

    /**
     * @notice Liquidates an undercollateralized position.
     * @param user The position owner to liquidate.
     * @param debtToCover Amount of UBTC debt to cover.
     */
    function liquidate(address user, uint256 debtToCover) external whenNotPaused nonReentrant {
        if (debtToCover == 0) revert ZeroAmount();
        _checkOracleFreshness();
        if (_isAboveLiquidation(user)) revert NotLiquidatable();

        Position storage pos = positions[user];
        if (debtToCover > pos.debt) debtToCover = pos.debt;

        // Liquidator gets proportional collateral + 5% bonus
        uint256 collateralShare = (pos.collateral * debtToCover) / pos.debt;
        uint256 bonus = (collateralShare * 500) / 10000; // 5% bonus
        uint256 collateralSeized = collateralShare + bonus;
        if (collateralSeized > pos.collateral) collateralSeized = pos.collateral;

        pos.debt -= debtToCover;
        pos.collateral -= collateralSeized;
        totalCollateral -= collateralSeized;

        // Burn UBTC from liquidator
        ubtc.controllerBurn(msg.sender, debtToCover);

        // Send collateral to liquidator (CEI: state already updated above)
        (bool success, ) = msg.sender.call{value: collateralSeized}("");
        if (!success) revert TransferFailed();

        emit Liquidated(user, msg.sender, debtToCover, collateralSeized);
    }

    // ---- View Functions ----

    /**
     * @notice Returns the collateral ratio of a position in basis points.
     */
    function getCollateralRatio(address user) public view returns (uint256) {
        Position storage pos = positions[user];
        if (pos.debt == 0) return type(uint256).max;

        uint256 btcPrice = priceOracle.getPrice(); // 8 decimals
        uint256 collateralValueUSD = (pos.collateral * btcPrice) / 10 ** 8;
        return (collateralValueUSD * 10000) / pos.debt;
    }

    function _isHealthy(address user) internal view returns (bool) {
        return getCollateralRatio(user) >= collateralRatioBps;
    }

    function _isAboveLiquidation(address user) internal view returns (bool) {
        return getCollateralRatio(user) >= liquidationRatioBps;
    }

    function _checkOracleFreshness() internal view {
        if (block.timestamp - priceOracle.lastUpdated() > MAX_ORACLE_STALENESS) {
            revert StaleOracle();
        }
    }

    // ---- DAO Governance Functions ----

    function grantMinterRole(address minter) external onlyDAO {
        hasRole[minter] = true;
    }

    function setMintLimit(uint256 _newLimit) external onlyDAO {
        mintLimitPerDay = _newLimit;
        emit ParameterUpdated("mintLimitPerDay", _newLimit);
    }

    function setFee(uint256 _newFeeBps) external onlyDAO {
        feeBps = _newFeeBps;
        emit ParameterUpdated("feeBps", _newFeeBps);
    }

    function setPaused(bool _paused) external onlyDAO {
        paused = _paused;
        emit StatusUpdated(_paused);
    }

    function setCollateralRatio(uint256 _newRatioBps) external onlyDAO {
        collateralRatioBps = _newRatioBps;
        emit ParameterUpdated("collateralRatioBps", _newRatioBps);
    }

    function setLiquidationRatio(uint256 _newRatioBps) external onlyDAO {
        liquidationRatioBps = _newRatioBps;
        emit ParameterUpdated("liquidationRatioBps", _newRatioBps);
    }

    function setOracle(address _newOracle) external onlyDAO {
        priceOracle = IPriceOracle(_newOracle);
        emit OracleUpdated(_newOracle);
    }

    receive() external payable {}
}
