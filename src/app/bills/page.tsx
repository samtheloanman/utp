import Link from 'next/link';
import { listStoredBills } from '@/lib/civic/storedBills';

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  const bills = await listStoredBills();
  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Bills you can vote on</h1>
      <p style={{ marginBottom: '1rem' }}>
        Real legislation pulled from city and county records. Each one links to its source.{' '}
        <Link href="/coverage">See which places are covered</Link>.
      </p>
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
