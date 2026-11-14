import { describe, expect, it, vi } from 'vitest';
import {
  CIVIC_BANNER_CONFIG_KEY,
  resolveDaoChainConfig,
} from '@/lib/contracts';
import { handleGetAppConfig, type AppConfigRpcClient } from './handler';
import { GET } from './route';

const APP_CONFIG = '0x4444444444444444444444444444444444444444';
const GOVERNOR = '0x1111111111111111111111111111111111111111';

describe('GET /api/app-config', () => {
  it('returns 503 structured unconfigured JSON with no-store when AppConfig address is unset', async () => {
    const config = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '31',
      NEXT_PUBLIC_APP_CONFIG_ADDRESS: '',
    });

    const response = await handleGetAppConfig(
      new Request('http://localhost:3000/api/app-config?key=civic.banner'),
      { config }
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = await response.json();
    expect(body).toMatchObject({
      status: 'unconfigured',
      source: 'unconfigured',
      isConfigured: false,
      chainId: 31,
      appConfigAddress: null,
      key: 'civic.banner',
      keyHash: CIVIC_BANNER_CONFIG_KEY,
      value: null,
    });
  });

  it('reads AppConfig.getConfig via viem and returns 200 with chain metadata', async () => {
    const readContract = vi.fn(async () => 'approved-by-dao');
    const mockClient: AppConfigRpcClient = {
      getChainId: vi.fn(async () => 31),
      getBlockNumber: vi.fn(async () => BigInt(8_282_100)),
      readContract,
    };

    const config = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '31',
      NEXT_PUBLIC_GOVERNOR_ADDRESS: GOVERNOR,
      NEXT_PUBLIC_APP_CONFIG_ADDRESS: APP_CONFIG,
    });

    const response = await handleGetAppConfig(
      new Request('http://localhost:3000/api/app-config?key=civic.banner'),
      { config, client: mockClient }
    );

    expect(response.status).toBe(200);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: APP_CONFIG,
        functionName: 'getConfig',
        args: [CIVIC_BANNER_CONFIG_KEY],
      })
    );

    const body = await response.json();
    expect(body).toEqual({
      status: 'ok',
      source: 'chain',
      isConfigured: true,
      chainId: 31,
      networkLabel:
        'Rootstock Testnet · Chain 31 · Bitcoin-Anchored EVM Sidechain',
      appConfigAddress: APP_CONFIG,
      blockNumber: 8_282_100,
      key: 'civic.banner',
      keyHash: CIVIC_BANNER_CONFIG_KEY,
      value: 'approved-by-dao',
    });
  });

  it('returns 503 unavailable with no-store when RPC fails or reports wrong chainId', async () => {
    const config = resolveDaoChainConfig({
      NEXT_PUBLIC_CHAIN_ID: '31',
      NEXT_PUBLIC_APP_CONFIG_ADDRESS: APP_CONFIG,
    });

    const response = await handleGetAppConfig(
      new Request('http://localhost:3000/api/app-config'),
      {
        config,
        client: {
          getChainId: async () => 1,
          getBlockNumber: async () => BigInt(100),
          readContract: async () => 'wrong-chain',
        },
      }
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = await response.json();
    expect(body.status).toBe('unavailable');
    expect(body.value).toBeNull();
  });

  it('returns 400 through route GET export when key query parameter is empty', async () => {
    const response = await GET(
      new Request('http://localhost:3000/api/app-config?key=%20%20')
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe('invalid_request');
  });
});
