import { resolveDaoChainConfig } from '@/lib/contracts';
import { GovernorStorageRpcReader } from './governorStorageReader';
import { PonderDbReader } from './ponderDbReader';
import type { DaoOverview } from './types';

export interface DaoReader {
  readOverview(): Promise<DaoOverview>;
}

/**
 * Selects the active `DaoReader` adapter:
 *   - Wave 2 (default): `GovernorStorageRpcReader` (`viem` `eth_call` against Rootstock Testnet 31, zero `eth_getLogs`)
 *   - Wave 3 (`DAO_READER_DRIVER=ponder`): `PonderDbReader` (`@supabase/supabase-js` against `public.dao_proposals` on UTP Alpha-Net)
 */
export function createDaoReader(
  env: Record<string, string | undefined> = process.env
): DaoReader {
  const config = resolveDaoChainConfig(env);
  if (env.DAO_READER_DRIVER === 'ponder') {
    return new PonderDbReader({ config });
  }
  return new GovernorStorageRpcReader({ config });
}

export * from './types';
export {
  GovernorStorageRpcReader,
  decodeProposalAction,
  summarizeDecodedActions,
  DEFAULT_CONFIRMATION_BLOCKS,
  type RpcReadClient,
} from './governorStorageReader';
export { PonderDbReader } from './ponderDbReader';
