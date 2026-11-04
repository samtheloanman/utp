import { headers } from 'next/headers';

interface LegislatureResponse {
  status: 'live' | 'stale' | 'unavailable' | 'not_integrated';
  fetchedAt: string | null;
  source: { name: string; url: string };
  items: Array<{ externalId: string; number: string; title: string; status: string; sourceUrl: string }>;
}

const LABEL: Record<LegislatureResponse['status'], string> = {
  live: 'Live', stale: 'Stale', unavailable: 'Unavailable', not_integrated: 'Not integrated',
};

async function load(): Promise<LegislatureResponse | null> {
  try {
    const h = await headers();
    const host = h.get('host');
    if (!host) return null;
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const res = await fetch(`${proto}://${host}/api/legislature?country=US`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as LegislatureResponse) : null;
  } catch {
    return null;
  }
}

export default async function LegislaturePage() {
  const data = await load();
  const status = data?.status ?? 'unavailable';
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Legislature</h1>
      <p>Status: {LABEL[status]}</p>
      {data?.fetchedAt && <p>Fetched: {data.fetchedAt} from {data.source.name}</p>}
      {data && data.items.length > 0 ? (
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
