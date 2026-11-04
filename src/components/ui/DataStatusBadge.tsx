import React from 'react';
import type { SourceStatus } from '@/lib/civic/types';

export type DataStatus = SourceStatus | 'sample';

const LABEL: Record<DataStatus, string> = {
  live: 'Live',
  stale: 'Stale',
  unavailable: 'Unavailable',
  not_integrated: 'Not integrated',
  sample: 'Sample data',
};

export function DataStatusBadge({ status, fetchedAt }: { status: DataStatus; fetchedAt?: string | null }) {
  // Fetch time is only meaningful when data was actually retrieved.
  const showTime = fetchedAt && (status === 'live' || status === 'stale');
  return (
    <span className={'data-status data-status-' + status} data-status={status}>
      {LABEL[status]}
      {showTime ? <span className="data-status-time"> · {fetchedAt}</span> : null}
    </span>
  );
}
