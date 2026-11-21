import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_UTP_ALPHA_CHAIN_ID,
  resolveDaoChainConfig,
  type ResolvedDaoChainConfig,
} from '@/lib/contracts';
import {
  DEFAULT_CONFIRMATION_BLOCKS,
  decodeProposalAction,
  summarizeDecodedActions,
} from './governorStorageReader';
import {
  toProposalStateLabel,
  type DaoOverview,
  type DaoProposalSummary,
} from './types';
import type { DaoReader } from './reader';

export interface DaoProposalRow {
  chain_id: number;
  proposal_id: string;
  proposer_address: string;
  targets: string[] | null;
  values: string[] | null;
  calldatas: string[] | null;
  description: string | null;
  description_hash: string;
  state: number;
  for_votes: string | number;
  against_votes: string | number;
  abstain_votes: string | number;
  eta_timestamp: string | null;
  synced_block: number | string;
  synced_at: string;
}

export interface PonderDbReaderOptions {
  config?: ResolvedDaoChainConfig;
  supabase?: SupabaseClient;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  confirmationBlocks?: number;
}

/**
 * Wave 3 UTP Alpha-Net reader: queries indexed `public.dao_proposals` rows populated by Ponder
 * over Alpha-Net's controlled `eth_getLogs` RPC, returning the identical `DaoOverview` shape.
 */
export class PonderDbReader implements DaoReader {
  private readonly config: ResolvedDaoChainConfig;
  private readonly injectedSupabase?: SupabaseClient;
  private readonly supabaseUrl?: string;
  private readonly supabaseAnonKey?: string;
  private readonly confirmationBlocks: number;

  constructor(options: PonderDbReaderOptions = {}) {
    this.config =
      options.config ??
      resolveDaoChainConfig({
        ...process.env,
        NEXT_PUBLIC_CHAIN_ID:
          process.env.NEXT_PUBLIC_CHAIN_ID || String(DEFAULT_UTP_ALPHA_CHAIN_ID),
      });
    this.injectedSupabase = options.supabase;
    this.supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey =
      options.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.confirmationBlocks = Math.max(
      0,
      options.confirmationBlocks ?? DEFAULT_CONFIRMATION_BLOCKS
    );
  }

  private getSupabaseClient(): SupabaseClient | null {
    if (this.injectedSupabase) return this.injectedSupabase;
    if (!this.supabaseUrl || !this.supabaseAnonKey) return null;
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async readOverview(): Promise<DaoOverview> {
    const fetchedAt = new Date().toISOString();
    const {
      networkLabel,
      networkKind,
      chainId,
      governorAddress,
      timelockAddress,
      tokenAddress,
      appConfigAddress,
    } = this.config;

    const supabase = this.getSupabaseClient();
    if (!supabase || !governorAddress) {
      return {
        networkLabel,
        networkKind,
        chainId,
        isConfigured: false,
        status: 'unconfigured',
        errorMessage: null,
        governorAddress,
        timelockAddress,
        tokenAddress,
        appConfigAddress,
        latestBlock: null,
        confirmedBlock: null,
        confirmationBlocks: this.confirmationBlocks,
        proposals: [],
        fetchedAt,
      };
    }

    try {
      const { data, error } = await supabase
        .from('dao_proposals')
        .select(
          'chain_id, proposal_id, proposer_address, targets, values, calldatas, description, description_hash, state, for_votes, against_votes, abstain_votes, eta_timestamp, synced_block, synced_at'
        )
        .eq('chain_id', chainId)
        .order('synced_block', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as DaoProposalRow[];
      const latestBlock =
        rows.length > 0
          ? rows.reduce(
              (max, row) => Math.max(max, Number(row.synced_block) || 0),
              0
            )
          : null;
      const confirmedBlock =
        latestBlock !== null
          ? Math.max(0, latestBlock - this.confirmationBlocks)
          : null;

      const proposals: DaoProposalSummary[] = rows.map((row, idx) => {
        const targets = Array.isArray(row.targets) ? row.targets.map(String) : [];
        const values = Array.isArray(row.values) ? row.values.map(String) : [];
        const calldatas = Array.isArray(row.calldatas)
          ? row.calldatas.map(String)
          : [];

        const actions = targets.map((target, actionIdx) =>
          decodeProposalAction({
            target,
            valueWei: values[actionIdx] ?? '0',
            calldata: calldatas[actionIdx] ?? '0x',
            appConfigAddress,
          })
        );

        const { stateCode, state } = toProposalStateLabel(Number(row.state));
        const syncedBlockNum = Number(row.synced_block) || 0;
        const isConfirmed =
          confirmedBlock !== null ? syncedBlockNum <= confirmedBlock : true;
        const parsedEta = row.eta_timestamp
          ? Math.floor(new Date(row.eta_timestamp).getTime() / 1000)
          : null;

        return {
          index: idx,
          proposalId: String(row.proposal_id),
          proposerAddress: row.proposer_address || null,
          stateCode,
          state,
          targets,
          values,
          calldatas,
          description: row.description,
          descriptionHash: row.description_hash,
          decodedSummary: summarizeDecodedActions(actions),
          actions,
          forVotesWei: String(row.for_votes ?? '0'),
          againstVotesWei: String(row.against_votes ?? '0'),
          abstainVotesWei: String(row.abstain_votes ?? '0'),
          etaTimestamp:
            parsedEta !== null && Number.isFinite(parsedEta) ? parsedEta : null,
          isConfirmed,
          confirmationDepth: isConfirmed ? this.confirmationBlocks : 0,
        };
      });

      return {
        networkLabel,
        networkKind,
        chainId,
        isConfigured: true,
        status: 'live',
        errorMessage: null,
        governorAddress,
        timelockAddress,
        tokenAddress,
        appConfigAddress,
        latestBlock,
        confirmedBlock,
        confirmationBlocks: this.confirmationBlocks,
        proposals,
        fetchedAt,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to read public.dao_proposals';
      return {
        networkLabel,
        networkKind,
        chainId,
        isConfigured: true,
        status: 'unavailable',
        errorMessage: message,
        governorAddress,
        timelockAddress,
        tokenAddress,
        appConfigAddress,
        latestBlock: null,
        confirmedBlock: null,
        confirmationBlocks: this.confirmationBlocks,
        proposals: [],
        fetchedAt,
      };
    }
  }
}
