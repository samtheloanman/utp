import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUTPBalance } from '../hooks';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x123',
    chainId: 31,
  })),
  useReadContract: vi.fn((params) => ({
    data: params,
    isPending: false,
    isSuccess: true,
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    data: '0xabc',
    isPending: false,
    error: null,
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isSuccess: true,
  })),
}));

vi.mock('../contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../contracts')>();
  return {
    ...mod,
    ADDRESSES: {
      rskTestnet: {
        UTPToken: '0xUTP',
        GovernancePlugin: '0xGOV',
        EventMarket: '0xEVENT',
        StablecoinController: '0xSTABLE',
        UBTC: '0xUBTC',
      }
    }
  };
});

describe('Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUTPBalance', () => {
    it('reads from UTP Token contract with correctly mocked wagmi context', () => {
      const { result } = renderHook(() => useUTPBalance());
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBeDefined();
    });
  });
});
