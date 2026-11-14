import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { parseEther } from 'viem';

const mockConnect = vi.fn();
const mockSwitchChain = vi.fn();
const mockWriteContract = vi.fn();

let accountState: {
  address?: `0x${string}`;
  isConnected: boolean;
  chainId?: number;
} = {
  address: undefined,
  isConnected: false,
  chainId: undefined,
};

let readContractValues: Record<string, bigint> = {};

vi.mock('wagmi', () => ({
  useAccount: () => accountState,
  useConnect: () => ({
    connectors: [{ id: 'injected', name: 'Injected' }],
    connect: mockConnect,
    isPending: false,
  }),
  useSwitchChain: () => ({
    switchChain: mockSwitchChain,
    isPending: false,
  }),
  useReadContract: ({ functionName }: { functionName: string }) => ({
    data: readContractValues[functionName],
  }),
  useWriteContract: () => ({
    writeContract: mockWriteContract,
    data: undefined,
    error: null,
    isPending: false,
  }),
}));

import GovernancePage, { revalidate } from './page';
import { GovernanceClient } from '@/components/governance/GovernanceClient';
import type { DaoOverview } from '@/modules/dao-chain/types';

const GOVERNOR = '0x1111111111111111111111111111111111111111';
const TIMELOCK = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x3333333333333333333333333333333333333333';
const APP_CONFIG = '0x4444444444444444444444444444444444444444';
const VOTER_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function buildLiveOverview(overrides: Partial<DaoOverview> = {}): DaoOverview {
  return {
    networkLabel: 'Rootstock Testnet · Chain 31 · Bitcoin-Anchored EVM Sidechain',
    networkKind: 'sidechain_evm',
    chainId: 31,
    isConfigured: true,
    status: 'live',
    errorMessage: null,
    governorAddress: GOVERNOR,
    timelockAddress: TIMELOCK,
    tokenAddress: TOKEN,
    appConfigAddress: APP_CONFIG,
    latestBlock: 8_282_080,
    confirmedBlock: 8_282_078,
    confirmationBlocks: 2,
    fetchedAt: '2026-11-14T00:00:00.000Z',
    proposals: [
      {
        index: 0,
        proposalId: '1001',
        proposerAddress: VOTER_A,
        stateCode: 1,
        state: 'Active',
        targets: [APP_CONFIG],
        values: ['0'],
        calldatas: ['0x1234abcd'],
        description: 'DIP-1: Set civic.banner',
        descriptionHash:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        decodedSummary: 'AppConfig.setConfig(civic.banner, "approved-by-dao")',
        actions: [
          {
            target: APP_CONFIG,
            valueWei: '0',
            calldata: '0x1234abcd',
            isRecognized: true,
            summary: 'AppConfig.setConfig(civic.banner, "approved-by-dao")',
          },
        ],
        forVotesWei: parseEther('250000').toString(),
        againstVotesWei: '0',
        abstainVotesWei: '0',
        etaTimestamp: null,
        isConfirmed: true,
        confirmationDepth: 2,
      },
      {
        index: 1,
        proposalId: '1002',
        proposerAddress: null,
        stateCode: 5,
        state: 'Queued',
        targets: ['0x9999999999999999999999999999999999999999'],
        values: ['0'],
        calldatas: ['0xdeadbeef'],
        description: null,
        descriptionHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        decodedSummary: 'Unrecognized calldata',
        actions: [
          {
            target: '0x9999999999999999999999999999999999999999',
            valueWei: '0',
            calldata: '0xdeadbeef',
            isRecognized: false,
            summary: 'Unrecognized calldata',
          },
        ],
        forVotesWei: parseEther('500000').toString(),
        againstVotesWei: '0',
        abstainVotesWei: '0',
        etaTimestamp: 1_795_000_000,
        isConfirmed: true,
        confirmationDepth: 2,
      },
    ],
    ...overrides,
  };
}

describe('/governance Server Component & GovernanceClient UI', () => {
  beforeEach(() => {
    accountState = { address: undefined, isConnected: false, chainId: undefined };
    readContractValues = {};
    mockConnect.mockClear();
    mockSwitchChain.mockClear();
    mockWriteContract.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('exports revalidate = 15 and renders honest Preview / Contracts Not Deployed state with zero fake proposals when unconfigured', async () => {
    expect(revalidate).toBe(15);
    vi.stubEnv('NEXT_PUBLIC_GOVERNOR_ADDRESS', '');
    vi.stubEnv('NEXT_PUBLIC_CHAIN_ID', '31');

    const element = await GovernancePage();
    render(element);

    expect(screen.getByTestId('network-badge')).toHaveTextContent(
      'Rootstock Testnet · Chain 31 · Bitcoin-Anchored EVM Sidechain'
    );
    expect(screen.getByTestId('chain-data-status')).toHaveTextContent(
      'Preview / Contracts Not Deployed'
    );
    expect(screen.getByTestId('empty-proposals-state')).toHaveTextContent(
      'No synthetic or placeholder proposals are shown'
    );
    expect(screen.getByTestId('delegate-button')).toBeDisabled();
    expect(screen.getByTestId('propose-button')).toBeDisabled();
  });

  it('renders Live Chain Data, 4 KPI cards, and slide-in Calldata & Evidence Drawer with unrecognized calldata warning', () => {
    accountState = {
      address: VOTER_A,
      isConnected: true,
      chainId: 31,
    };
    readContractValues = {
      balanceOf: parseEther('250000'),
      getVotes: BigInt(0), // Undelegated holder -> shows delegate prompt
    };

    render(<GovernanceClient overview={buildLiveOverview()} />);

    expect(screen.getByTestId('chain-data-status')).toHaveTextContent(
      'Live Chain Data'
    );
    expect(screen.getByTestId('kpi-proposals')).toHaveTextContent('2');
    expect(screen.getByTestId('kpi-blocks')).toHaveTextContent('#8,282,078');
    expect(screen.getByTestId('kpi-quorum')).toHaveTextContent('400,000 UTP');
    expect(screen.getByTestId('kpi-voting-power')).toHaveTextContent(
      'Delegate first'
    );

    // Open slide-in drawer for unrecognized calldata proposal #1002
    const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectButtons[1]);

    const drawer = screen.getByTestId('calldata-drawer');
    expect(drawer).toHaveTextContent('Unrecognized calldata:');
    expect(drawer).toHaveTextContent('0xdeadbeef');
    expect(drawer).toHaveTextContent('1795000000');
  });

  it('disables write actions and prompts chain switch when wallet is on wrong chain', () => {
    accountState = {
      address: VOTER_A,
      isConnected: true,
      chainId: 1, // Ethereum mainnet instead of Chain 31
    };

    render(<GovernanceClient overview={buildLiveOverview()} />);

    expect(screen.getByTestId('wrong-chain-banner')).toHaveTextContent(
      'Switch to Chain 31'
    );
    expect(screen.getByTestId('delegate-button')).toBeDisabled();
    expect(screen.getByTestId('propose-button')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Chain 31' }));
    expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 31 });
  });

  it('executes delegate(), castVote(), and propose() wagmi contract writes when connected on active chain', () => {
    accountState = {
      address: VOTER_A,
      isConnected: true,
      chainId: 31,
    };
    readContractValues = {
      balanceOf: parseEther('250000'),
      getVotes: parseEther('250000'),
    };

    render(
      <GovernanceClient
        overview={buildLiveOverview({
          networkLabel: 'UTP Alpha-Net · Chain 99931',
          networkKind: 'utp_alpha_l2',
          chainId: 99931,
        })}
      />
    );

    // Switch accountState to 99931 and re-render for Alpha-Net interactive writes
    cleanup();
    accountState = {
      address: VOTER_A,
      isConnected: true,
      chainId: 99931,
    };
    render(
      <GovernanceClient
        overview={buildLiveOverview({
          networkLabel: 'UTP Alpha-Net · Chain 99931',
          networkKind: 'utp_alpha_l2',
          chainId: 99931,
        })}
      />
    );

    expect(screen.getByTestId('network-badge')).toHaveTextContent(
      'UTP Alpha-Net · Chain 99931'
    );

    // 1. delegate()
    fireEvent.click(screen.getByTestId('delegate-button'));
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TOKEN,
        functionName: 'delegate',
        args: [VOTER_A],
        chainId: 99931,
      })
    );

    // 2. castVote()
    fireEvent.click(screen.getByRole('button', { name: 'Vote For' }));
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: GOVERNOR,
        functionName: 'castVote',
        args: [BigInt(1001), 1],
        chainId: 99931,
      })
    );

    // 3. propose()
    fireEvent.click(screen.getByTestId('propose-button'));
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: GOVERNOR,
        functionName: 'propose',
        chainId: 99931,
      })
    );
  });
});
