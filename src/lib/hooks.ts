'use client';

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, type Address } from 'viem';
import {
  UTPTokenABI, GovernancePluginABI, EventMarketABI,
  StablecoinControllerABI, UBTCABI, ADDRESSES,
} from './contracts';

// ---- Utility: resolve address by chain ----

function getAddresses(chainId: number | undefined) {
  if (!chainId) return ADDRESSES.hardhat;
  if (chainId === 31) return ADDRESSES.rskTestnet;
  if (chainId === 30) return ADDRESSES.rskMainnet;
  return ADDRESSES.hardhat;
}

// ---- UTP Token Hooks ----

export function useUTPBalance() {
  const { address, chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.UTPToken as Address,
    abi: UTPTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useUTPTotalSupply() {
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.UTPToken as Address,
    abi: UTPTokenABI,
    functionName: 'totalSupply',
  });
}

export function useUTPVotingPower() {
  const { address, chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.UTPToken as Address,
    abi: UTPTokenABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useUTPDelegate() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    delegate: (delegatee: Address) => writeContract({
      address: addrs.UTPToken as Address,
      abi: UTPTokenABI,
      functionName: 'delegate',
      args: [delegatee],
    }),
    isPending,
    isSuccess,
    error,
  };
}

export function useUTPTransfer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    transfer: (to: Address, amount: string) => writeContract({
      address: addrs.UTPToken as Address,
      abi: UTPTokenABI,
      functionName: 'transfer',
      args: [to, parseEther(amount)],
    }),
    isPending,
    isSuccess,
    error,
  };
}

// ---- Governance Hooks ----

export function useProposalsCount() {
    const { chainId } = useAccount();
    const addrs = getAddresses(chainId);
    return useReadContract({
        address: addrs.GovernancePlugin as Address,
        abi: GovernancePluginABI,
        functionName: 'getProposalsCount',
    });
}

export function useProposal(proposalId: bigint) {
    const { chainId } = useAccount();
    const addrs = getAddresses(chainId);
    return useReadContract({
        address: addrs.GovernancePlugin as Address,
        abi: GovernancePluginABI,
        functionName: 'proposals',
        args: [proposalId],
        query: {
            enabled: proposalId !== undefined,
        }
    });
}

export function useGovernanceQuorum() {
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.GovernancePlugin as Address,
    abi: GovernancePluginABI,
    functionName: 'quorumThreshold',
  });
}

export function useCreateProposal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    createProposal: (target: Address, value: bigint, calldata: `0x${string}`) =>
      writeContract({
        address: addrs.GovernancePlugin as Address,
        abi: GovernancePluginABI,
        functionName: 'createProposal',
        args: [[target], [value], [calldata]],
      }),
    isPending,
    isSuccess,
    error,
  };
}

// ---- EventMarket Hooks ----

export function useEventCount() {
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.EventMarket as Address,
    abi: EventMarketABI,
    functionName: 'eventCount',
  });
}

export function useStakeVote() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    stakeVote: (eventId: bigint, optionIndex: bigint, amount: string) =>
      writeContract({
        address: addrs.EventMarket as Address,
        abi: EventMarketABI,
        functionName: 'stakeVote',
        args: [eventId, optionIndex, parseEther(amount)],
      }),
    isPending,
    isSuccess,
    error,
  };
}

// ---- Stablecoin Hooks ----

export function useStablecoinPosition() {
  const { address, chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.StablecoinController as Address,
    abi: StablecoinControllerABI,
    functionName: 'positions',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useCollateralRatio() {
  const { address, chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.StablecoinController as Address,
    abi: StablecoinControllerABI,
    functionName: 'getCollateralRatio',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useTotalCollateral() {
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.StablecoinController as Address,
    abi: StablecoinControllerABI,
    functionName: 'totalCollateral',
  });
}

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    deposit: (rbtcAmount: string, ubtcAmount: string) =>
      writeContract({
        address: addrs.StablecoinController as Address,
        abi: StablecoinControllerABI,
        functionName: 'deposit',
        args: [parseEther(ubtcAmount)],
        value: parseEther(rbtcAmount),
      }),
    isPending,
    isSuccess,
    error,
  };
}

export function useRedeem() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  const addrs = getAddresses(chainId);
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    redeem: (ubtcAmount: string) =>
      writeContract({
        address: addrs.StablecoinController as Address,
        abi: StablecoinControllerABI,
        functionName: 'redeem',
        args: [parseEther(ubtcAmount)],
      }),
    isPending,
    isSuccess,
    error,
  };
}

// ---- UBTC Balance ----

export function useUBTCBalance() {
  const { address, chainId } = useAccount();
  const addrs = getAddresses(chainId);
  return useReadContract({
    address: addrs.UBTC as Address,
    abi: UBTCABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// ---- Helper ----
export { formatEther, parseEther, getAddresses };
