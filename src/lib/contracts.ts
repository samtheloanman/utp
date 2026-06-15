export const UTP_POLLING_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Localhost address. Change this for RSK testnet.

export const UTP_POLLING_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "issueId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "voteType",
        "type": "uint8"
      }
    ],
    "name": "Voted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "issueId",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "voteType",
        "type": "uint8"
      }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "issueId",
        "type": "string"
      }
    ],
    "name": "getVoteCounts",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "forVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "againstVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "unsureVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalVoices",
            "type": "uint256"
          }
        ],
        "internalType": "struct UTPPolling.VoteCount",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "votes",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
