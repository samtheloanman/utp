export type SourceStatus = 'live' | 'stale' | 'unavailable' | 'not_integrated';

export interface CivicBill {
  externalId: string;
  jurisdictionCode: string;
  number: string;
  title: string;
  status: string;
  introducedDate: string | null;
  sourceUrl: string;
  /** Identifies the fetched record state; NOT a bill-text version hash. */
  recordHash: string;
}

export interface SourceResult<T> {
  status: SourceStatus;
  items: T[];
  fetchedAt: string | null;
  source: { name: string; url: string };
  error?: string;
}

export interface SourceAdapter {
  id: string;
  jurisdictionCode: string;
  fetchBills(o: { limit: number; signal?: AbortSignal }): Promise<SourceResult<CivicBill>>;
}
