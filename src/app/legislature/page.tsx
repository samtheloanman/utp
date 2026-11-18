import { getLegislature, getLocalLegislature } from '@/lib/civic/legislature';
import { DataStatusBadge } from '@/components/ui/DataStatusBadge';

export const dynamic = 'force-dynamic';

interface LegislatureResponse {
  status: 'live' | 'stale' | 'unavailable' | 'not_integrated';
  fetchedAt: string | null;
  source: { name: string; url: string };
  items: Array<{ externalId: string; number: string; title: string; status: string; sourceUrl: string }>;
  jurisdiction?: { name: string } | null;
}

interface PageProps {
  searchParams?: Promise<{ local?: string }>;
}

export default async function LegislaturePage({ searchParams }: PageProps) {
  const local = (await searchParams)?.local;
  const data: LegislatureResponse = local ? await getLocalLegislature(local) : await getLegislature('US');
  const place = data.jurisdiction?.name;
  const status = data.status;
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>{place ? `Legislature: ${place}` : 'Legislature'}</h1>
      <p><a href="/coverage">Browse cities and counties</a></p>
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
