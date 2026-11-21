import Link from 'next/link';
import { listPlaces, listStoredBills } from '@/lib/civic/storedBills';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{ place?: string }>;
}

const chip: React.CSSProperties = { marginRight: '0.75rem', whiteSpace: 'nowrap' };

export default async function BillsPage({ searchParams }: PageProps) {
  const place = (await searchParams)?.place;
  const [bills, places] = await Promise.all([listStoredBills(50, undefined, place), listPlaces()]);
  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Bills you can vote on</h1>
      <p style={{ marginBottom: '1rem' }}>
        Real legislation pulled from city and county records. Each one links to its source.{' '}
        <Link href="/coverage">See which places are covered</Link>.
      </p>
      {places.length > 0 && (
        <nav aria-label="Filter by place" style={{ marginBottom: '1rem', lineHeight: 1.9, fontSize: 14 }}>
          <Link href="/bills" style={chip} aria-current={place ? undefined : 'page'}>All places</Link>
          {places.map((p) => (
            <Link key={p.id} href={`/bills?place=${p.id}`} style={chip} aria-current={p.id === place ? 'page' : undefined}>{p.name}</Link>
          ))}
        </nav>
      )}
      {bills.length === 0 ? (
        <p>No bills have been stored yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {bills.map((b) => (
            <li key={b.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border, #e5e5e5)' }}>
              <Link href={`/bill/${b.id}`} style={{ fontWeight: 600 }}>{b.title}</Link>
              <div style={{ fontSize: 13, color: 'var(--muted, #666)' }}>
                {[b.place, b.number, b.status].filter(Boolean).join(' · ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
