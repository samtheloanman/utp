import { isAddress, keccak256, toHex, type Address, type Hex } from 'viem';

export const UTP_POLLING_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Localhost legacy polling contract

export const RSK_TESTNET_CHAIN_ID = 31;
export const DEFAULT_UTP_ALPHA_CHAIN_ID = 99931;
export const HARDHAT_CHAIN_ID = 31337;

export const DEFAULT_RSK_TESTNET_RPC_URL = 'https://public-node.testnet.rsk.co';
export const DEFAULT_UTP_ALPHA_RPC_URL = 'http://127.0.0.1:8545';

export const CIVIC_BANNER_CONFIG_KEY: Hex = keccak256(toHex('civic.banner'));
export const CIVIC_VOTING_CLOSED_CONFIG_KEY: Hex = keccak256(toHex('CIVIC_VOTING_CLOSED'));

export const KNOWN_APP_CONFIG_KEYS: Readonly<Record<string, string>> = {
  [CIVIC_BANNER_CONFIG_KEY.toLowerCase()]: 'civic.banner',
  [CIVIC_VOTING_CLOSED_CONFIG_KEY.toLowerCase()]: 'CIVIC_VOTING_CLOSED',
};

export type DaoNetworkKind = 'sidechain_evm' | 'utp_alpha_l2' | 'local';

export interface ResolvedDaoChainConfig {
  chainId: number;
  slug: 'rsk-testnet' | 'utp-alpha' | 'hardhat';
  networkKind: DaoNetworkKind;
  networkLabel: string;
  rpcUrl: string;
  governorAddress: Address | null;
  timelockAddress: Address | null;
  tokenAddress: Address | null;
  appConfigAddress: Address | null;
  isConfigured: boolean;
}

export interface DeploymentAddressesInput {
  GovernancePlugin?: string | null;
  UtPTimelock?: string | null;
  UTPToken?: string | null;
  AppConfig?: string | null;
}

function normalizeAddress(value?: string | null): Address | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  return isAddress(trimmed) ? (trimmed as Address) : null;
}

export function getNetworkMetadata(
  chainId: number,
  utpAlphaChainId = DEFAULT_UTP_ALPHA_CHAIN_ID
): Pick<ResolvedDaoChainConfig, 'slug' | 'networkKind' | 'networkLabel'> {
  if (chainId === RSK_TESTNET_CHAIN_ID) {
    return {
      slug: 'rsk-testnet',
      networkKind: 'sidechain_evm',
      networkLabel: 'Rootstock Testnet · Chain 31 · Bitcoin-Anchored EVM Sidechain',
    };
  }
  if (chainId === HARDHAT_CHAIN_ID) {
    return {
      slug: 'hardhat',
      networkKind: 'local',
      networkLabel: 'Hardhat Local · Chain 31337 · Ephemeral Devnet',
    };
  }
  if (chainId === utpAlphaChainId) {
    return {
      slug: 'utp-alpha',
      networkKind: 'utp_alpha_l2',
      networkLabel: `UTP Alpha-Net · Chain ${chainId}`,
    };
  }
  return {
    slug: 'utp-alpha',
    networkKind: 'utp_alpha_l2',
    networkLabel: `UTP Alpha-Net · Chain ${chainId}`,
  };
}

export function resolveDaoChainConfig(
  env: Record<string, string | undefined> = process.env,
  manifestContracts?: DeploymentAddressesInput | null
): ResolvedDaoChainConfig {
  const alphaChainId = Number(
    env.NEXT_PUBLIC_UTP_ALPHA_CHAIN_ID || env.UTP_ALPHA_CHAIN_ID || DEFAULT_UTP_ALPHA_CHAIN_ID
  );
  const requestedChainId = Number(env.NEXT_PUBLIC_CHAIN_ID || RSK_TESTNET_CHAIN_ID);
  const chainId = Number.isFinite(requestedChainId) && requestedChainId > 0
    ? requestedChainId
    : RSK_TESTNET_CHAIN_ID;

  const meta = getNetworkMetadata(chainId, alphaChainId);

  const rpcUrl =
    chainId === RSK_TESTNET_CHAIN_ID
      ? env.NEXT_PUBLIC_RSK_TESTNET_RPC_URL || env.RSK_TESTNET_RPC_URL || DEFAULT_RSK_TESTNET_RPC_URL
      : chainId === HARDHAT_CHAIN_ID
        ? env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545'
        : env.NEXT_PUBLIC_UTP_ALPHA_RPC_URL || env.UTP_ALPHA_RPC_URL || DEFAULT_UTP_ALPHA_RPC_URL;

  const governorAddress = normalizeAddress(
    env.NEXT_PUBLIC_GOVERNOR_ADDRESS || env.GOVERNOR_ADDRESS || manifestContracts?.GovernancePlugin
  );
  const timelockAddress = normalizeAddress(
    env.NEXT_PUBLIC_TIMELOCK_ADDRESS || env.TIMELOCK_ADDRESS || manifestContracts?.UtPTimelock
  );
  const tokenAddress = normalizeAddress(
    env.NEXT_PUBLIC_UTP_TOKEN_ADDRESS || env.UTP_TOKEN_ADDRESS || manifestContracts?.UTPToken
  );
  const appConfigAddress = normalizeAddress(
    env.NEXT_PUBLIC_APP_CONFIG_ADDRESS || env.APP_CONFIG_ADDRESS || manifestContracts?.AppConfig
  );

  return {
    chainId,
    ...meta,
    rpcUrl,
    governorAddress,
    timelockAddress,
    tokenAddress,
    appConfigAddress,
    isConfigured: Boolean(governorAddress),
  };
}

export const APP_CONFIG_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'initialOwner', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'key', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'value', type: 'string' },
      { indexed: true, internalType: 'address', name: 'executor', type: 'address' },
    ],
    name: 'ConfigSet',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'key', type: 'bytes32' }],
    name: 'getConfig',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'key', type: 'bytes32' },
      { internalType: 'string', name: 'value', type: 'string' },
    ],
    name: 'setConfig',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const GOVERNOR_STORAGE_ABI = [
  {
    inputs: [],
    name: 'proposalCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'proposalDetailsAt',
    outputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
      { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
      { internalType: 'bytes32', name: 'descriptionHash', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'proposalDetails',
    outputs: [
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
      { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
      { internalType: 'bytes32', name: 'descriptionHash', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'state',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'proposalVotes',
    outputs: [
      { internalType: 'uint256', name: 'againstVotes', type: 'uint256' },
      { internalType: 'uint256', name: 'forVotes', type: 'uint256' },
      { internalType: 'uint256', name: 'abstainVotes', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'proposalEta',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proposalThreshold',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'hasVoted',
    outputs: [{ internalType: 'boolean', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
      { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
      { internalType: 'string', name: 'description', type: 'string' },
    ],
    name: 'propose',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'uint8', name: 'support', type: 'uint8' },
    ],
    name: 'castVote',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'queue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const UTP_TOKEN_VOTES_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getVotes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'delegates',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'delegatee', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const UTP_POLLING_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'issueId', type: 'string' },
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'uint8', name: 'voteType', type: 'uint8' },
    ],
    name: 'Voted',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'string', name: 'issueId', type: 'string' },
      { internalType: 'uint8', name: 'voteType', type: 'uint8' },
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'issueId', type: 'string' }],
    name: 'getVoteCounts',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'forVotes', type: 'uint256' },
          { internalType: 'uint256', name: 'againstVotes', type: 'uint256' },
          { internalType: 'uint256', name: 'unsureVotes', type: 'uint256' },
          { internalType: 'uint256', name: 'totalVoices', type: 'uint256' },
        ],
        internalType: 'struct UTPPolling.VoteCount',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '', type: 'string' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'votes',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];
