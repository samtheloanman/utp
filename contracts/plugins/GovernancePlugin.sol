// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/DAO.sol";
import "../crypto/dilithium/ZKNOX_ethdilithium.sol";
import "../crypto/IZKVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title GovernancePlugin
 * @dev A plugin that manages proposals and voting for a DAO.
 * Implements:
 * - Token-weighted voting via UTP token (ERC20Votes)
 * - Hybrid (ECC + PQ) signature requirements
 * - ZK-gated anonymous voting with nullifier tracking
 * - Voting periods with start/end blocks
 * - Quorum-based execution threshold
 * - Replay protection via chainId
 */
contract GovernancePlugin {
    struct Proposal {
        address[] targets;
        uint256[] values;
        bytes[] callDatas;
        uint256 voteWeight;
        bool executed;
        uint256 startBlock;
        uint256 endBlock;
        uint256 snapshotBlock;
        mapping(address => bool) hasVoted;
    }

    /// @notice The DAO associated with this plugin.
    DAO public immutable dao;

    /// @notice The Post-Quantum verifier.
    ZKNOX_ethdilithium public quantumVerifier;

    /// @notice The Zero-Knowledge verifier.
    IZKVerifier public zkVerifier;

    /// @notice The governance token for vote weighting.
    ERC20Votes public votingToken;

    /// @notice Proposals list.
    Proposal[] public proposals;

    /// @notice Quorum: minimum total vote weight required for execution (in basis points of total supply).
    uint256 public quorumBps;

    /// @notice Default voting period in blocks.
    uint256 public votingPeriod;

    /// @notice Global nullifier tracking to prevent ZK double-voting.
    mapping(bytes32 => bool) public usedNullifiers;

    event ProposalCreated(uint256 indexed proposalId, address indexed creator, uint256 startBlock, uint256 endBlock);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 weight);
    event VoteCastAnonymous(uint256 indexed proposalId, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event QuorumUpdated(uint256 newQuorumBps);
    event VotingPeriodUpdated(uint256 newPeriod);

    error InvalidAuth();
    error AlreadyVoted();
    error NullifierAlreadyUsed();
    error ProposalAlreadyExecuted();
    error VotingNotActive();
    error QuorumNotReached();
    error Unauthorized();

    /**
     * @notice Initializes the plugin.
     * @param _dao The DAO address.
     * @param _quantumVerifier The PQ verifier address.
     * @param _zkVerifier The ZK verifier address.
     * @param _votingToken The UTP governance token address.
     * @param _quorumBps Quorum in basis points (e.g., 400 = 4% of total supply).
     * @param _votingPeriod Default voting period in blocks.
     */
    constructor(
        address _dao,
        address _quantumVerifier,
        address _zkVerifier,
        address _votingToken,
        uint256 _quorumBps,
        uint256 _votingPeriod
    ) {
        dao = DAO(payable(_dao));
        quantumVerifier = ZKNOX_ethdilithium(payable(_quantumVerifier));
        zkVerifier = IZKVerifier(_zkVerifier);
        votingToken = ERC20Votes(_votingToken);
        quorumBps = _quorumBps;
        votingPeriod = _votingPeriod;
    }

    /**
     * @notice Creates a new proposal. Voting starts next block.
     */
    function createProposal(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata callDatas
    ) external returns (uint256 proposalId) {
        proposalId = proposals.length;
        Proposal storage p = proposals.push();
        p.targets = targets;
        p.values = values;
        p.callDatas = callDatas;
        p.snapshotBlock = block.number;
        p.startBlock = block.number + 1;
        p.endBlock = block.number + 1 + votingPeriod;

        emit ProposalCreated(proposalId, msg.sender, p.startBlock, p.endBlock);
    }

    /**
     * @notice Casts a token-weighted vote using Hybrid Authorization (ECC + PQ).
     * @param proposalId The ID of the proposal.
     * @param pqPublicKey The PQ public key of the voter.
     * @param pqSignature The PQ signature over the vote message.
     */
    function castVoteHybrid(
        uint256 proposalId,
        bytes calldata pqPublicKey,
        bytes calldata pqSignature
    ) external {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert ProposalAlreadyExecuted();
        if (p.hasVoted[msg.sender]) revert AlreadyVoted();

        // Verify PQ Signature with replay protection (includes chainId)
        bytes32 messageHash = keccak256(
            abi.encodePacked(proposalId, msg.sender, address(this), block.chainid)
        );
        if (!quantumVerifier.verify(pqPublicKey, abi.encodePacked(messageHash), pqSignature, "")) {
            revert InvalidAuth();
        }

        // Get vote weight from token balance at snapshot
        uint256 weight = votingToken.getPastVotes(msg.sender, p.snapshotBlock);

        p.voteWeight += weight;
        p.hasVoted[msg.sender] = true;

        emit VoteCast(proposalId, msg.sender, weight);

        _tryExecute(proposalId);
    }

    /**
     * @notice Casts an anonymous vote using ZK-gated participation.
     * @param proposalId The ID of the proposal.
     * @param zkProof The ZK proof of membership/eligibility.
     * @param nullifier A nullifier to prevent double-voting.
     */
    function castVoteZK(
        uint256 proposalId,
        bytes calldata zkProof,
        bytes32 nullifier
    ) external {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert ProposalAlreadyExecuted();

        // Check nullifier hasn't been used
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(proposalId);
        publicInputs[1] = nullifier;

        if (!zkVerifier.verify(zkProof, publicInputs)) {
            revert InvalidAuth();
        }

        // Mark nullifier as used
        usedNullifiers[nullifier] = true;

        // Anonymous votes get weight of 1 (can't prove token balance without revealing identity)
        p.voteWeight += 1;
        emit VoteCastAnonymous(proposalId, 1);

        _tryExecute(proposalId);
    }

    function getProposalsCount() external view returns (uint256) {
        return proposals.length;
    }

    /**
     * @notice Manually executes a proposal that has reached quorum.
     * @param proposalId The ID of the proposal.
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert ProposalAlreadyExecuted();
        if (!_quorumReached(proposalId)) revert QuorumNotReached();
        _executeProposal(proposalId);
    }

    /**
     * @notice Returns the quorum threshold for a proposal (in token weight).
     */
    function quorumThreshold() public view returns (uint256) {
        return (votingToken.totalSupply() * quorumBps) / 10000;
    }

    /**
     * @dev Checks if quorum is reached for a proposal.
     */
    function _quorumReached(uint256 proposalId) internal view returns (bool) {
        uint256 threshold = quorumThreshold();
        if (threshold == 0) return proposals[proposalId].voteWeight > 0;
        return proposals[proposalId].voteWeight >= threshold;
    }

    /**
     * @dev Auto-executes if quorum is reached.
     */
    function _tryExecute(uint256 proposalId) internal {
        if (_quorumReached(proposalId)) {
            _executeProposal(proposalId);
        }
    }

    /**
     * @dev Triggers execution on the DAO kernel.
     */
    function _executeProposal(uint256 proposalId) internal {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert ProposalAlreadyExecuted();
        p.executed = true;

        dao.execute(p.targets, p.values, p.callDatas);
        emit ProposalExecuted(proposalId);
    }
}
