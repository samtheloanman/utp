// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UTPPolling {
    // issue ID => user address => vote (1=for, 2=against, 3=unsure)
    mapping(string => mapping(address => uint8)) public votes;
    
    // issue ID => vote counts
    struct VoteCount {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 unsureVotes;
        uint256 totalVoices;
    }
    
    mapping(string => VoteCount) public voteCounts;

    event Voted(string indexed issueId, address indexed voter, uint8 voteType);

    function castVote(string calldata issueId, uint8 voteType) external {
        require(voteType == 1 || voteType == 2 || voteType == 3, "Invalid vote type");
        
        uint8 existingVote = votes[issueId][msg.sender];
        if (existingVote == voteType) {
            return; // No change
        }

        VoteCount storage counts = voteCounts[issueId];

        // Remove old vote
        if (existingVote != 0) {
            if (existingVote == 1) counts.forVotes--;
            else if (existingVote == 2) counts.againstVotes--;
            else if (existingVote == 3) counts.unsureVotes--;
        } else {
            // New voter
            counts.totalVoices++;
        }

        // Add new vote
        if (voteType == 1) counts.forVotes++;
        else if (voteType == 2) counts.againstVotes++;
        else if (voteType == 3) counts.unsureVotes++;

        votes[issueId][msg.sender] = voteType;

        emit Voted(issueId, msg.sender, voteType);
    }
    
    function getVoteCounts(string calldata issueId) external view returns (VoteCount memory) {
        return voteCounts[issueId];
    }
}
