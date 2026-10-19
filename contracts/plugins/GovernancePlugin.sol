// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @dev Post-quantum signature verifier (e.g. ZKNOX Dilithium). Same shape as ZKNOX_ethdilithium.verify.
interface IPQVerifier {
    function verify(bytes calldata pk, bytes calldata m, bytes calldata sig, string calldata aux) external view returns (bool);
}

/**
 * @title GovernancePlugin
 * @notice Binding, token-weighted governance for the UtP DAO.
 * @dev Built on OpenZeppelin Governor (audited):
 *      - For / Against / Abstain counting (GovernorCountingSimple)
 *      - Voting delay, voting period, proposal threshold (GovernorSettings)
 *      - Vote weight and quorum from UTP ERC20Votes snapshots (GovernorVotes, GovernorVotesQuorumFraction)
 *      - Successful proposals are queued and executed ONLY through the timelock (GovernorTimelockControl)
 *
 *      Optional post-quantum hybrid mode (off by default, see roadmap decision D1):
 *      when `requireHybridAuth` is true, every vote must carry a PQ signature in `params`
 *      (abi.encode(bytes pqPublicKey, bytes pqSignature)) over `hybridVoteDigest(...)`.
 *      Enforced in `_castVote`, so castVote / castVoteBySig cannot bypass it (no downgrade).
 */
contract GovernancePlugin is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /// @notice PQ verifier used when hybrid auth is required. Zero when hybrid mode is off.
    IPQVerifier public immutable pqVerifier;

    /// @notice When true, every vote must include a valid PQ signature.
    bool public immutable requireHybridAuth;

    error HybridAuthRequired();
    error InvalidHybridAuth();
    error HybridVerifierMissing();

    struct Config {
        uint48 votingDelay; // blocks between proposal and vote start
        uint32 votingPeriod; // blocks the vote stays open
        uint256 proposalThreshold; // min UTP votes to propose
        uint256 quorumPercent; // % of past total supply (0-100)
    }

    constructor(
        IVotes token,
        TimelockController timelock,
        Config memory cfg,
        address pqVerifier_,
        bool requireHybridAuth_
    )
        Governor("UtP Governance")
        GovernorSettings(cfg.votingDelay, cfg.votingPeriod, cfg.proposalThreshold)
        GovernorVotes(token)
        GovernorVotesQuorumFraction(cfg.quorumPercent)
        GovernorTimelockControl(timelock)
    {
        if (requireHybridAuth_ && pqVerifier_ == address(0)) revert HybridVerifierMissing();
        pqVerifier = IPQVerifier(pqVerifier_);
        requireHybridAuth = requireHybridAuth_;
    }

    // ------------------------------------------------------------------
    // Hybrid (post-quantum) voting
    // ------------------------------------------------------------------

    /// @notice Message a voter signs with their PQ key. Binds proposal, voter, choice, contract and chain (replay protection).
    function hybridVoteDigest(uint256 proposalId, address voter, uint8 support) public view returns (bytes32) {
        return keccak256(abi.encodePacked(proposalId, voter, support, address(this), block.chainid));
    }

    /// @notice Convenience wrapper: vote with a PQ signature.
    function castVoteHybrid(
        uint256 proposalId,
        uint8 support,
        bytes calldata pqPublicKey,
        bytes calldata pqSignature
    ) external returns (uint256) {
        return _castVote(proposalId, _msgSender(), support, "", abi.encode(pqPublicKey, pqSignature));
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason,
        bytes memory params
    ) internal override returns (uint256) {
        if (requireHybridAuth) {
            if (params.length == 0) revert HybridAuthRequired();
            (bytes memory pk, bytes memory sig) = abi.decode(params, (bytes, bytes));
            bytes32 digest = hybridVoteDigest(proposalId, account, support);
            if (sig.length == 0 || !pqVerifier.verify(pk, abi.encodePacked(digest), sig, "")) {
                revert InvalidHybridAuth();
            }
        }
        return super._castVote(proposalId, account, support, reason, params);
    }

    // ------------------------------------------------------------------
    // Required overrides
    // ------------------------------------------------------------------

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
