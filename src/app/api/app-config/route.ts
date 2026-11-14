import { NextResponse } from 'next/server';
import {
  createPublicClient,
  http,
  isHex,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import {
  APP_CONFIG_ABI,
  resolveDaoChainConfig,
  type ResolvedDaoChainConfig,
} from '@/lib/contracts';

const DEFAULT_KEY_NAME = 'civic.banner';
const MAX_KEY_LENGTH = 128;

export interface AppConfigRpcClient {
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  readContract(params: {
    address: Address;
    abi: typeof APP_CONFIG_ABI;
    functionName: 'getConfig';
    args: readonly [Hex];
  }): Promise<string>;
}

export interface ReadAppConfigDeps {
  config?: ResolvedDaoChainConfig;
  client?: AppConfigRpcClient;
  rpcTimeoutMs?: number;
}

export function resolveConfigKeyHash(
  rawKey: string | null
): { ok: true; key: string; keyHash: Hex } | { ok: false; error: string } {
  const key = rawKey === null ? DEFAULT_KEY_NAME : rawKey.trim();
  if (!key || key.length > MAX_KEY_LENGTH) {
    return {
      ok: false,
      error: `Query parameter "key" must be 1..${MAX_KEY_LENGTH} characters`,
    };
  }
  if (key.startsWith('0x') && key.length === 66 && isHex(key)) {
    return { ok: true, key, keyHash: key as Hex };
  }
  return { ok: true, key, keyHash: keccak256(toHex(key)) };
}

export async function handleGetAppConfig(
  request: Request,
  deps: ReadAppConfigDeps = {}
): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsedKey = resolveConfigKeyHash(url.searchParams.get('key'));

  if (!parsedKey.ok) {
    return NextResponse.json(
      {
        status: 'invalid_request',
        error: parsedKey.error,
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const config = deps.config ?? resolveDaoChainConfig();
  const { key, keyHash } = parsedKey;

  if (!config.appConfigAddress) {
    return NextResponse.json(
      {
        status: 'unconfigured',
        source: 'unconfigured',
        isConfigured: false,
        chainId: config.chainId,
        networkLabel: config.networkLabel,
        appConfigAddress: null,
        key,
        keyHash,
        value: null,
        error: 'AppConfig contract address is not configured',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const client: AppConfigRpcClient =
      deps.client ??
      (createPublicClient({
        transport: http(config.rpcUrl, { timeout: deps.rpcTimeoutMs ?? 4_000 }),
      }) as unknown as AppConfigRpcClient);

    const [rpcChainId, blockNumberBig, value] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
      client.readContract({
        address: config.appConfigAddress,
        abi: APP_CONFIG_ABI,
        functionName: 'getConfig',
        args: [keyHash],
      }),
    ]);

    if (Number(rpcChainId) !== config.chainId) {
      throw new Error(
        `RPC chainId mismatch: expected ${config.chainId}, received ${rpcChainId}`
      );
    }

    return NextResponse.json(
      {
        status: 'ok',
        source: 'chain',
        isConfigured: true,
        chainId: config.chainId,
        networkLabel: config.networkLabel,
        appConfigAddress: config.appConfigAddress,
        blockNumber: Number(blockNumberBig),
        key,
        keyHash,
        value,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to read AppConfig from RPC';
    return NextResponse.json(
      {
        status: 'unavailable',
        source: 'unavailable',
        isConfigured: true,
        chainId: config.chainId,
        networkLabel: config.networkLabel,
        appConfigAddress: config.appConfigAddress,
        key,
        keyHash,
        value: null,
        error: message,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleGetAppConfig(request);
}
