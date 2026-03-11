// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/DAO.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EventMarket
 * @dev Polymarket-style prediction/voting market for global events and legislation.
 * Users stake UTP tokens on outcomes of events. Correct voters share the total pool.
 *
 * Flow: createEvent → stakeVote → resolveEvent → claimRewards
 *
 * Features:
 * - Region/country tagging for filtering
 * - DAO-governed event creation and resolution
 * - Proportional reward distribution to correct voters
 * - Emergency cancellation with full refund
 */
contract EventMarket {
    using SafeERC20 for IERC20;

    struct MarketEvent {
        string description;
        string regionTag;        // e.g. "US", "EU", "GLOBAL"
        uint256 numOptions;
        uint256 deadline;
        uint256 totalStaked;
        uint256 winningOption;   // Set on resolution
        bool resolved;
        bool cancelled;
    }

    /// @notice The DAO that governs this market.
    DAO public immutable dao;

    /// @notice The token used for staking votes.
    IERC20 public immutable stakingToken;

    /// @notice Permission ID required to create events.
    bytes32 public constant CREATE_EVENT_PERMISSION_ID = keccak256("CREATE_EVENT_PERMISSION");

    /// @notice Permission ID required to resolve events.
    bytes32 public constant RESOLVE_EVENT_PERMISSION_ID = keccak256("RESOLVE_EVENT_PERMISSION");

    /// @notice List of all market events.
    MarketEvent[] public events;

    /// @notice Stakes per event per option: eventId => optionIndex => total staked
    mapping(uint256 => mapping(uint256 => uint256)) public optionStakes;

    /// @notice Individual stakes: eventId => voter => optionIndex => amount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userStakes;

    /// @notice Total staked by a user on an event (across all options)
    mapping(uint256 => mapping(address => uint256)) public userTotalStake;

    /// @notice Whether a user has claimed rewards for an event
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event EventCreated(uint256 indexed eventId, string description, string regionTag, uint256 numOptions, uint256 deadline);
    event VoteStaked(uint256 indexed eventId, address indexed voter, uint256 optionIndex, uint256 amount);
    event EventResolved(uint256 indexed eventId, uint256 winningOption);
    event EventCancelled(uint256 indexed eventId);
    event RewardsClaimed(uint256 indexed eventId, address indexed voter, uint256 amount);

    error Unauthorized();
    error EventExpired();
    error EventNotExpired();
    error EventAlreadyResolved();
    error EventNotResolved();
    error EventCancelledError();
    error InvalidOption();
    error ZeroAmount();
    error AlreadyClaimed();
    error NothingToClaim();

    /**
     * @notice Initializes the EventMarket.
     * @param _dao The DAO address.
     * @param _stakingToken The UTP token address for staking.
     */
    constructor(address _dao, address _stakingToken) {
        dao = DAO(payable(_dao));
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @notice Creates a new prediction event.
     * @param description Event description.
     * @param regionTag Region or country tag (e.g., "US", "EU", "GLOBAL").
     * @param numOptions Number of outcome options (minimum 2).
     * @param deadline Timestamp after which voting closes.
     */
    function createEvent(
        string calldata description,
        string calldata regionTag,
        uint256 numOptions,
        uint256 deadline
    ) external returns (uint256 eventId) {
        if (!dao.hasPermission(address(this), msg.sender, CREATE_EVENT_PERMISSION_ID)) {
            revert Unauthorized();
        }
        require(numOptions >= 2, "Min 2 options");
        require(deadline > block.timestamp, "Deadline must be future");

        eventId = events.length;
        events.push(MarketEvent({
            description: description,
            regionTag: regionTag,
            numOptions: numOptions,
            deadline: deadline,
            totalStaked: 0,
            winningOption: 0,
            resolved: false,
            cancelled: false
        }));

        emit EventCreated(eventId, description, regionTag, numOptions, deadline);
    }

    /**
     * @notice Stakes UTP tokens on an outcome option.
     * @param eventId The event to vote on.
     * @param optionIndex The option to stake on (0-indexed).
     * @param amount The number of UTP tokens to stake.
     */
    function stakeVote(uint256 eventId, uint256 optionIndex, uint256 amount) external {
        MarketEvent storage e = events[eventId];
        if (e.cancelled) revert EventCancelledError();
        if (e.resolved) revert EventAlreadyResolved();
        if (block.timestamp >= e.deadline) revert EventExpired();
        if (optionIndex >= e.numOptions) revert InvalidOption();
        if (amount == 0) revert ZeroAmount();

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        optionStakes[eventId][optionIndex] += amount;
        userStakes[eventId][msg.sender][optionIndex] += amount;
        userTotalStake[eventId][msg.sender] += amount;
        e.totalStaked += amount;

        emit VoteStaked(eventId, msg.sender, optionIndex, amount);
    }

    /**
     * @notice Resolves an event with the winning option.
     * @param eventId The event to resolve.
     * @param winningOption The winning option index.
     */
    function resolveEvent(uint256 eventId, uint256 winningOption) external {
        if (!dao.hasPermission(address(this), msg.sender, RESOLVE_EVENT_PERMISSION_ID)) {
            revert Unauthorized();
        }
        MarketEvent storage e = events[eventId];
        if (e.resolved) revert EventAlreadyResolved();
        if (e.cancelled) revert EventCancelledError();
        if (winningOption >= e.numOptions) revert InvalidOption();

        e.resolved = true;
        e.winningOption = winningOption;

        emit EventResolved(eventId, winningOption);
    }

    /**
     * @notice Cancels an event and enables full refunds.
     * @param eventId The event to cancel.
     */
    function cancelEvent(uint256 eventId) external {
        if (!dao.hasPermission(address(this), msg.sender, RESOLVE_EVENT_PERMISSION_ID)) {
            revert Unauthorized();
        }
        MarketEvent storage e = events[eventId];
        if (e.resolved) revert EventAlreadyResolved();

        e.cancelled = true;
        emit EventCancelled(eventId);
    }

    /**
     * @notice Claims rewards after event resolution.
     * Winners receive proportional share of total pool.
     * If cancelled, everyone gets a full refund.
     * @param eventId The resolved/cancelled event.
     */
    function claimRewards(uint256 eventId) external {
        MarketEvent storage e = events[eventId];
        if (hasClaimed[eventId][msg.sender]) revert AlreadyClaimed();

        uint256 payout;

        if (e.cancelled) {
            // Cancelled: full refund of total stake
            payout = userTotalStake[eventId][msg.sender];
        } else {
            if (!e.resolved) revert EventNotResolved();
            // Resolved: winners get proportional share of total pool
            uint256 userWinningStake = userStakes[eventId][msg.sender][e.winningOption];
            if (userWinningStake == 0) revert NothingToClaim();

            uint256 winningPool = optionStakes[eventId][e.winningOption];
            // payout = (userWinningStake / winningPool) * totalStaked
            payout = (userWinningStake * e.totalStaked) / winningPool;
        }

        if (payout == 0) revert NothingToClaim();

        hasClaimed[eventId][msg.sender] = true;
        stakingToken.safeTransfer(msg.sender, payout);

        emit RewardsClaimed(eventId, msg.sender, payout);
    }

    /**
     * @notice Returns the total number of events.
     */
    function eventCount() external view returns (uint256) {
        return events.length;
    }

    /**
     * @notice Returns a user's stake on a specific option.
     */
    function getUserStake(uint256 eventId, address user, uint256 optionIndex) external view returns (uint256) {
        return userStakes[eventId][user][optionIndex];
    }

    /**
     * @notice Calculates expected payout for a user if a specific option wins.
     */
    function calculatePayout(uint256 eventId, address user, uint256 optionIndex) external view returns (uint256) {
        MarketEvent storage e = events[eventId];
        uint256 userOptionStake = userStakes[eventId][user][optionIndex];
        if (userOptionStake == 0) return 0;

        uint256 optionPool = optionStakes[eventId][optionIndex];
        if (optionPool == 0) return 0;

        return (userOptionStake * e.totalStaked) / optionPool;
    }
}
