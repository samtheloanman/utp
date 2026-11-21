/**
 * Wave 3 UTP Alpha-Net Ponder Indexer Configuration Template (`ponder.sh`).
 *
 * Why Wave 3 (Alpha-Net) and NOT Wave 2 (Rootstock public RPC):
 *   - Public Rootstock Testnet (Chain 31) nodes disable `eth_getLogs` (`-32601` / `code 19`),
 *     so Wave 2 uses `GovernorStorageRpcReader` (`eth_call` `proposalCount` + `proposalDetailsAt`).
 *   - On UTP Alpha-Net (`UTP_ALPHA_CHAIN_ID`, controlled RPC with full `eth_getLogs` support),
 *     deploy an open-source Ponder worker with this config to stream `GovernancePlugin` and
 *     `AppConfig` events into `public.dao_proposals` and `public.dao_votes`, then flip
 *     `DAO_READER_DRIVER=ponder` so Next.js reads via `PonderDbReader` with zero UI changes.
 *
 * Standalone Ponder service usage:
 *   1. In a dedicated indexer workspace with `@ponder/core` installed, replace
 *      `defineAlphaNetPonderConfig` with `createConfig` from `@ponder/core`.
 *   2. Insert the Alpha-Net row into `public.chain_networks` and deploy contracts via:
 *        `npx hardhat run scripts/deploy.cjs --network utpAlpha`
 *   3. Point `DATABASE_URL` at Supabase Postgres (`ponder` schema for internal sync state,
 *      mirroring finalized rows into `public.dao_proposals` / `public.dao_votes`).
 */

import {
  APP_CONFIG_ABI,
  DEFAULT_UTP_ALPHA_CHAIN_ID,
  DEFAULT_UTP_ALPHA_RPC_URL,
  GOVERNOR_STORAGE_ABI,
} from '../../src/lib/contracts';

export interface PonderNetworkSpec {
  chainId: number;
  transportUrl: string;
  pollingIntervalMs: number;
  maxRequestsPerSecond: number;
}

export interface PonderContractSpec {
  network: string;
  abi: readonly unknown[];
  address: `0x${string}`;
  startBlock: number;
}

export interface AlphaNetPonderConfig {
  database: {
    kind: 'postgres';
    connectionString?: string;
    schema: string;
  };
  networks: Record<string, PonderNetworkSpec>;
  contracts: Record<string, PonderContractSpec>;
}

export function defineAlphaNetPonderConfig(
  env: Record<string, string | undefined> = process.env
): AlphaNetPonderConfig {
  const chainId = Number(env.UTP_ALPHA_CHAIN_ID || DEFAULT_UTP_ALPHA_CHAIN_ID);
  const transportUrl = env.UTP_ALPHA_RPC_URL || DEFAULT_UTP_ALPHA_RPC_URL;
  const startBlock = Number(env.UTP_ALPHA_START_BLOCK || 0);

  const governorAddress = (env.UTP_ALPHA_GOVERNOR_ADDRESS ||
    '0x0000000000000000000000000000000000000001') as `0x${string}`;
  const appConfigAddress = (env.UTP_ALPHA_APP_CONFIG_ADDRESS ||
    '0x0000000000000000000000000000000000000002') as `0x${string}`;

  return {
    database: {
      kind: 'postgres',
      connectionString: env.DATABASE_URL,
      schema: env.DATABASE_SCHEMA || 'ponder_alpha',
    },
    networks: {
      utpAlpha: {
        chainId,
        transportUrl,
        pollingIntervalMs: 2_000,
        maxRequestsPerSecond: 25,
      },
    },
    contracts: {
      GovernancePlugin: {
        network: 'utpAlpha',
        abi: GOVERNOR_STORAGE_ABI,
        address: governorAddress,
        startBlock,
      },
      AppConfig: {
        network: 'utpAlpha',
        abi: APP_CONFIG_ABI,
        address: appConfigAddress,
        startBlock,
      },
    },
  };
}

export default defineAlphaNetPonderConfig();
