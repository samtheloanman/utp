import { getLegislature } from '@/lib/civic/legislature';
import { DataStatusBadge } from '@/components/ui/DataStatusBadge';

export const dynamic = 'force-dynamic';

interface LegislatureResponse {
  status: 'live' | 'stale' | 'unavailable' | 'not_integrated';
  fetchedAt: string | null;
  source: { name: string; url: string };
  items: Array<{ externalId: string; number: string; title: string; status: string; sourceUrl: string }>;
}

export default async function LegislaturePage() {
  const data: LegislatureResponse = await getLegislature('US');
  const status = data.status;
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Legislature</h1>
      <p><DataStatusBadge status={status} fetchedAt={data.fetchedAt} /></p>
      {data.fetchedAt && <p>Fetched: {data.fetchedAt} from {data.source.name}</p>}
      {data.items.length > 0 ? (
        <ul>
          {data.items.map((b) => (
            <li key={b.externalId}>
              <a href={b.sourceUrl}>{b.number}</a> {b.title} ({b.status})
            </li>
          ))}
        </ul>
      ) : (
        <p>No bills to display.</p>
      )}
    </div>
  );
}
