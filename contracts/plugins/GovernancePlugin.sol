// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/DAO.sol";
import "../crypto/IQuantumVerifier.sol";
import "../crypto/IZKVerifier.sol";

/**
 * @title GovernancePlugin
 * @dev A plugin that manages proposals and voting for a DAO.
 * Implements hybrid (ECC + PQ) signature requirements and ZK-gated voting.
 */
contract GovernancePlugin {
    struct Proposal {
        address[] targets;
        uint256[] values;
        bytes[] callDatas;
        uint256 voteCount;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    /// @notice The DAO associated with this plugin.
    DAO public immutable dao;

    /// @notice The Post-Quantum verifier.
    IQuantumVerifier public quantumVerifier;

    /// @notice The Zero-Knowledge verifier.
    IZKVerifier public zkVerifier;

    /// @notice Proposals list.
    Proposal[] public proposals;

    /// @notice Threshold for proposal execution (simplistic count for prototype).
    uint256 public constant EXECUTION_THRESHOLD = 1;

    event ProposalCreated(uint256 indexed proposalId, address indexed creator);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ProposalExecuted(uint256 indexed proposalId);

    error InvalidAuth();
    error AlreadyVoted();
    error ProposalAlreadyExecuted();
    error Unauthorized();

    /**
     * @notice Initializes the plugin.
     * @param _dao The DAO address.
     * @param _quantumVerifier The PQ verifier address.
     * @param _zkVerifier The ZK verifier address.
     */
    constructor(address _dao, address _quantumVerifier, address _zkVerifier) {
        dao = DAO(payable(_dao));
        quantumVerifier = IQuantumVerifier(_quantumVerifier);
        zkVerifier = IZKVerifier(_zkVerifier);
    }

    /**
     * @notice Creates a new proposal.
     */
    function createProposal(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata callDatas
    ) external returns (uint256 proposalId) {
        // In a real DAO, this would be gated by membership or token hold.
        proposalId = proposals.length;
        Proposal storage p = proposals.push();
        p.targets = targets;
        p.values = values;
        p.callDatas = callDatas;

        emit ProposalCreated(proposalId, msg.sender);
    }

    /**
     * @notice Casts a vote using Hybrid Authorization (ECC + PQ).
     * @param proposalId The ID of the proposal.
     * @param pqPublicKey The PQ public key of the voter.
     * @param pqSignature The PQ signature over the proposalId.
     */
    function castVoteHybrid(
        uint256 proposalId,
        bytes calldata pqPublicKey,
        bytes calldata pqSignature
    ) external {
        if (proposals[proposalId].hasVoted[msg.sender]) revert AlreadyVoted();
        
        // Verify PQ Signature (ECC is verified by msg.sender natively)
        // We hash the proposalId and msg.sender to prevent replay.
        bytes32 messageHash = keccak256(abi.encodePacked(proposalId, msg.sender, address(this)));
        if (!quantumVerifier.verify(pqPublicKey, messageHash, pqSignature)) {
            revert InvalidAuth();
        }

        proposals[proposalId].voteCount++;
        proposals[proposalId].hasVoted[msg.sender] = true;

        emit VoteCast(proposalId, msg.sender);

        if (proposals[proposalId].voteCount >= EXECUTION_THRESHOLD) {
            _executeProposal(proposalId);
        }
    }

    /**
     * @notice Casts a vote using ZK-gated anonymous participation.
     * @param proposalId The ID of the proposal.
     * @param zkProof The ZK proof of membership/eligibility.
     * @param nullifier A nullifier to prevent double-voting.
     */
    function castVoteZK(
        uint256 proposalId,
        bytes calldata zkProof,
        bytes32 nullifier
    ) external {
        // In a real scenario, nullifier would be tracked globally to prevent double-voting.
        // For the prototype, we use the publicInputs to pass the proposalId.
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(proposalId);
        publicInputs[1] = nullifier;

        if (!zkVerifier.verify(zkProof, publicInputs)) {
            revert InvalidAuth();
        }

        // Ideally, track nullifier: if (nullifiers[nullifier]) revert AlreadyVoted();
        
        proposals[proposalId].voteCount++;
        emit VoteCast(proposalId, address(0)); // Anonymous

        if (proposals[proposalId].voteCount >= EXECUTION_THRESHOLD) {
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
