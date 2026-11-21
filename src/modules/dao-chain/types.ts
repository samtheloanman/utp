import type { DaoNetworkKind } from '@/lib/contracts';

export type ProposalStateCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ProposalStateLabel =
  | 'Pending'
  | 'Active'
  | 'Canceled'
  | 'Defeated'
  | 'Succeeded'
  | 'Queued'
  | 'Expired'
  | 'Executed';

export const PROPOSAL_STATE_LABELS: Readonly<Record<ProposalStateCode, ProposalStateLabel>> = {
  0: 'Pending',
  1: 'Active',
  2: 'Canceled',
  3: 'Defeated',
  4: 'Succeeded',
  5: 'Queued',
  6: 'Expired',
  7: 'Executed',
};

export function toProposalStateLabel(code: number): {
  stateCode: ProposalStateCode;
  state: ProposalStateLabel;
} {
  const normalized = (code >= 0 && code <= 7 ? Math.trunc(code) : 0) as ProposalStateCode;
  return {
    stateCode: normalized,
    state: PROPOSAL_STATE_LABELS[normalized],
  };
}

export interface DecodedProposalAction {
  target: string;
  valueWei: string;
  calldata: string;
  isRecognized: boolean;
  summary: string;
  configKeyHex?: string;
  configKeyLabel?: string;
  configValue?: string;
}

export interface DaoProposalSummary {
  index: number;
  proposalId: string;
  proposerAddress: string | null;
  stateCode: ProposalStateCode;
  state: ProposalStateLabel;
  targets: string[];
  values: string[];
  calldatas: string[];
  description: string | null;
  descriptionHash: string;
  decodedSummary: string;
  actions: DecodedProposalAction[];
  forVotesWei: string;
  againstVotesWei: string;
  abstainVotesWei: string;
  etaTimestamp: number | null;
  isConfirmed: boolean;
  confirmationDepth: number;
}

export type DaoReadStatus = 'live' | 'unconfigured' | 'unavailable';

export interface DaoOverview {
  networkLabel: string;
  networkKind: DaoNetworkKind;
  chainId: number;
  isConfigured: boolean;
  status: DaoReadStatus;
  errorMessage?: string | null;
  governorAddress: string | null;
  timelockAddress: string | null;
  tokenAddress: string | null;
  appConfigAddress: string | null;
  latestBlock: number | null;
  confirmedBlock: number | null;
  confirmationBlocks: number;
  proposals: DaoProposalSummary[];
  fetchedAt: string;
}
