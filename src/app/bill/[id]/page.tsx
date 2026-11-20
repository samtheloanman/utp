import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoredBill, getTally, tallyPercent } from '@/lib/civic/storedBills';
import { VotePanel } from '@/components/issue/VotePanel';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BillPage({ params }: PageProps) {
  const { id } = await params;
  const bill = await getStoredBill(id);
  if (!bill) notFound();
  const tally = await getTally(bill.id);
  const proposeHref = `/propose?title=${encodeURIComponent(bill.title)}&sourceUrl=${encodeURIComponent(bill.sourceUrl)}&billId=${bill.id}`;

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <p><Link href="/bills">All bills</Link></p>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{bill.title}</h1>
      <p style={{ color: 'var(--muted, #666)' }}>{[bill.place, bill.number, bill.status].filter(Boolean).join(' · ')}</p>
      <p>
        <a href={bill.sourceUrl} target="_blank" rel="noopener noreferrer">Read it at the source</a>
        {bill.updatedAt ? <span> · last fetched {bill.updatedAt.slice(0, 10)}</span> : null}
      </p>
      <p>{tally.total} {tally.total === 1 ? 'vote' : 'votes'} so far</p>
      <div style={{ maxWidth: 420, marginTop: '1rem' }}>
        <VotePanel issue={{ id: bill.id, ...tallyPercent(tally) }} returnPath={`/bill/${bill.id}`} />
      </div>
      <p style={{ marginTop: '1.5rem' }}><Link href={proposeHref}>Propose action on this bill</Link></p>
    </div>
  );
}
