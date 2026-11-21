import { describe, expect, it, vi } from 'vitest';
import { encodeFunctionData, parseEther } from 'viem';
import {
  APP_CONFIG_ABI,
  CIVIC_BANNER_CONFIG_KEY,
  resolveDaoChainConfig,
} from '@/lib/contracts';
import {
  GovernorStorageRpcReader,
  PonderDbReader,
  createDaoReader,
  decodeProposalAction,
  type RpcReadClient,
} from './reader';
import type { SupabaseClient } from '@supabase/supabase-js';

const GOVERNOR = '0x1111111111111111111111111111111111111111';
const TIMELOCK = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x3333333333333333333333333333333333333333';
const APP_CONFIG = '0x4444444444444444444444444444444444444444';
const UNKNOWN_TARGET = '0x9999999999999999999999999999999999999999';
const DESC_HASH_1 =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DESC_HASH_2 =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('GovernorStorageRpcReader & DaoReader Port', () => {
  it('returns graceful unconfigured status with zero RPC calls when NEXT_PUBLIC_GOVERNOR_ADDRESS is unset', async () => {
    const readContract = vi.fn();
    const getBlockNumber = vi.fn();
    const getChainId = vi.fn();

    const config = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '31',
      NEXT_PUBLIC_GOVERNOR_ADDRESS: '',
    });

    const reader = new GovernorStorageRpcReader({
      config,
      client: { getBlockNumber, getChainId, readContract },
    });

    const overview = await reader.readOverview();

    expect(overview.isConfigured).toBe(false);
    expect(overview.status).toBe('unconfigured');
    expect(overview.chainId).toBe(31);
    expect(overview.networkLabel).toBe(
      'Rootstock Testnet · Chain 31 · Bitcoin-Anchored EVM Sidechain'
    );
    expect(overview.latestBlock).toBeNull();
    expect(overview.confirmedBlock).toBeNull();
    expect(overview.proposals).toEqual([]);
    expect(readContract).not.toHaveBeenCalled();
    expect(getBlockNumber).not.toHaveBeenCalled();
  });

  it('enumerates proposals via GovernorStorage eth_call with 2-block confirmation metadata and zero eth_getLogs calls', async () => {
    const validSetConfigCalldata = encodeFunctionData({
      abi: APP_CONFIG_ABI,
      functionName: 'setConfig',
      args: [CIVIC_BANNER_CONFIG_KEY, 'approved-by-dao'],
    });

    const mysteryCalldata = '0xdeadbeef00000000000000000000000000000000';

    const readContract = vi.fn(
      async (params: {
        functionName: string;
        args?: readonly unknown[];
        blockNumber?: bigint;
      }) => {
        if (params.functionName === 'proposalCount') {
          // Simulate 2 total proposals at head 8282080, 1 confirmed at block 8282078
          if (params.blockNumber === BigInt(8_282_078)) return BigInt(1);
          return BigInt(2);
        }
        if (params.functionName === 'proposalDetailsAt') {
          const idx = params.args?.[0];
          if (idx === BigInt(0)) {
            return [
              BigInt(1001),
              [APP_CONFIG],
              [BigInt(0)],
              [validSetConfigCalldata],
              DESC_HASH_1,
            ] as const;
          }
          return [
            BigInt(1002),
            [UNKNOWN_TARGET],
            [BigInt(0)],
            [mysteryCalldata],
            DESC_HASH_2,
          ] as const;
        }
        if (params.functionName === 'state') {
          return params.args?.[0] === BigInt(1001) ? 5 : 1; // 5 = Queued, 1 = Active
        }
        if (params.functionName === 'proposalVotes') {
          // OZ order: [againstVotes, forVotes, abstainVotes]
          if (params.args?.[0] === BigInt(1001)) {
            return [BigInt(0), parseEther('500000'), parseEther('10000')] as const;
          }
          return [parseEther('250000'), parseEther('250000'), BigInt(0)] as const;
        }
        if (params.functionName === 'proposalEta') {
          return params.args?.[0] === BigInt(1001) ? BigInt(1_795_000_000) : BigInt(0);
        }
        throw new Error(`Unexpected contract call: ${params.functionName}`);
      }
    );

    const mockClient: RpcReadClient & { getLogs?: () => never } = {
      getChainId: vi.fn(async () => 31),
      getBlockNumber: vi.fn(async () => BigInt(8_282_080)),
      readContract,
      getLogs: vi.fn(() => {
        throw new Error('eth_getLogs is forbidden on Rootstock public RPC');
      }),
    };

    const config = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '31',
      NEXT_PUBLIC_GOVERNOR_ADDRESS: GOVERNOR,
      NEXT_PUBLIC_TIMELOCK_ADDRESS: TIMELOCK,
      NEXT_PUBLIC_UTP_TOKEN_ADDRESS: TOKEN,
      NEXT_PUBLIC_APP_CONFIG_ADDRESS: APP_CONFIG,
    });

    const reader = new GovernorStorageRpcReader({
      config,
      client: mockClient,
      confirmationBlocks: 2,
    });

    const overview = await reader.readOverview();

    expect(mockClient.getLogs).not.toHaveBeenCalled();
    expect(overview.status).toBe('live');
    expect(overview.isConfigured).toBe(true);
    expect(overview.latestBlock).toBe(8_282_080);
    expect(overview.confirmedBlock).toBe(8_282_078);
    expect(overview.proposals).toHaveLength(2);

    const p0 = overview.proposals[0];
    expect(p0.proposalId).toBe('1001');
    expect(p0.state).toBe('Queued');
    expect(p0.isConfirmed).toBe(true);
    expect(p0.confirmationDepth).toBe(2);
    expect(p0.decodedSummary).toBe(
      'AppConfig.setConfig(civic.banner, "approved-by-dao")'
    );
    expect(p0.forVotesWei).toBe(parseEther('500000').toString());
    expect(p0.againstVotesWei).toBe('0');
    expect(p0.abstainVotesWei).toBe(parseEther('10000').toString());
    expect(p0.etaTimestamp).toBe(1_795_000_000);

    const p1 = overview.proposals[1];
    expect(p1.proposalId).toBe('1002');
    expect(p1.state).toBe('Active');
    expect(p1.isConfirmed).toBe(false);
    expect(p1.confirmationDepth).toBe(0);
    expect(p1.decodedSummary).toBe('Unrecognized calldata');
    expect(p1.actions[0].isRecognized).toBe(false);
    expect(p1.etaTimestamp).toBeNull();
  });

  it('rejects AppConfig.setConfig selector when targeting an unrecognized contract address', () => {
    const spoofedCalldata = encodeFunctionData({
      abi: APP_CONFIG_ABI,
      functionName: 'setConfig',
      args: [CIVIC_BANNER_CONFIG_KEY, 'spoofed'],
    });

    const decoded = decodeProposalAction({
      target: UNKNOWN_TARGET,
      valueWei: '0',
      calldata: spoofedCalldata,
      appConfigAddress: APP_CONFIG,
    });

    expect(decoded.isRecognized).toBe(false);
    expect(decoded.summary).toBe('Unrecognized calldata');
  });

  it('returns status="unavailable" without throwing when RPC fails or reports wrong chainId', async () => {
    const config = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '31',
      NEXT_PUBLIC_GOVERNOR_ADDRESS: GOVERNOR,
    });

    const reader = new GovernorStorageRpcReader({
      config,
      client: {
        getChainId: async () => 30, // Wrong chain (mainnet instead of testnet 31)
        getBlockNumber: async () => BigInt(100),
        readContract: async () => BigInt(0),
      },
    });

    const overview = await reader.readOverview();
    expect(overview.status).toBe('unavailable');
    expect(overview.isConfigured).toBe(true);
    expect(overview.proposals).toEqual([]);
    expect(overview.errorMessage).toMatch(/chainId mismatch/);
  });

  it('reads UTP Alpha-Net proposals from public.dao_proposals via PonderDbReader', async () => {
    const setConfigCalldata = encodeFunctionData({
      abi: APP_CONFIG_ABI,
      functionName: 'setConfig',
      args: [CIVIC_BANNER_CONFIG_KEY, 'alpha-live'],
    });

    const orderMock = vi.fn(async () => ({
      data: [
        {
          chain_id: 99931,
          proposal_id: '777',
          proposer_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          targets: [APP_CONFIG],
          values: ['0'],
          calldatas: [setConfigCalldata],
          description: 'Alpha-Net DIP-1',
          description_hash: DESC_HASH_1,
          state: 7,
          for_votes: parseEther('600000').toString(),
          against_votes: '0',
          abstain_votes: '0',
          eta_timestamp: '2026-11-15T00:00:00.000Z',
          synced_block: 420,
          synced_at: '2026-11-14T00:00:00.000Z',
        },
      ],
      error: null,
    }));
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));

    const alphaConfig = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '99931',
      UTP_ALPHA_CHAIN_ID: '99931',
      NEXT_PUBLIC_GOVERNOR_ADDRESS: GOVERNOR,
      NEXT_PUBLIC_APP_CONFIG_ADDRESS: APP_CONFIG,
    });

    const reader = new PonderDbReader({
      config: alphaConfig,
      supabase: { from: fromMock } as unknown as SupabaseClient,
    });

    const overview = await reader.readOverview();
    expect(fromMock).toHaveBeenCalledWith('dao_proposals');
    expect(eqMock).toHaveBeenCalledWith('chain_id', 99931);
    expect(overview.networkLabel).toBe('UTP Alpha-Net · Chain 99931');
    expect(overview.status).toBe('live');
    expect(overview.latestBlock).toBe(420);
    expect(overview.confirmedBlock).toBe(418);
    expect(overview.proposals[0].state).toBe('Executed');
    expect(overview.proposals[0].decodedSummary).toBe(
      'AppConfig.setConfig(civic.banner, "alpha-live")'
    );

    // Verify factory switches cleanly via DAO_READER_DRIVER
    const selected = createDaoReader({
      NEXT_PUBLIC_CHAIN_ID: '99931',
      DAO_READER_DRIVER: 'ponder',
    });
    expect(selected).toBeInstanceOf(PonderDbReader);
  });
});
