'use client';

import { useState, useEffect } from 'react';
import ShadowVote from '@/components/ShadowVote';
import { useParams } from 'next/navigation';

interface BillDetail {
  id: string;
  number: string;
  title: string;
  status: string;
  chamber: string;
  introduced: string;
  sponsor: string;
  country: string;
  url: string;
}

export default function BillPage() {
  const params = useParams();
  const id = params.id as string;
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBill() {
      try {
        // Extract country from the bill ID prefix (e.g., "us-hr4763" → "US")
        const countryPrefix = id.split('-')[0]?.toUpperCase() || 'US';
        const res = await fetch(`/api/legislature?country=${countryPrefix}`);
        if (res.ok) {
          const data = await res.json();
          const found = data.bills?.find((b: BillDetail) => b.id === id);
          if (found) {
            setBill(found);
          } else {
            // If not found, use fallback with the ID
            setBill({
              id,
              number: id,
              title: `Bill ${id}`,
              status: 'Unknown',
              chamber: 'Unknown',
              introduced: '',
              sponsor: '',
              country: countryPrefix,
              url: '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch bill:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-in">
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading bill details...
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="animate-in">
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Bill not found.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className="tag tag-btc">{bill.country}</span>
          <span className="tag tag-blue">{bill.status}</span>
          <span className="tag" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            {bill.chamber}
          </span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--btc-orange)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          {bill.number}
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.3 }}>
          {bill.title}
        </h1>
      </div>

      {/* Bill Info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem' }}>
          {[
            ['Country', bill.country],
            ['Chamber', bill.chamber],
            ['Status', bill.status],
            ['Introduced', bill.introduced || '—'],
            ['Sponsor', bill.sponsor || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        {bill.url && (
          <a
            href={bill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ marginTop: '1rem', display: 'inline-block', fontSize: '0.85rem' }}
          >
            View Full Text ↗
          </a>
        )}
      </div>

      {/* Shadow Vote */}
      <ShadowVote billId={id} />
    </div>
  );
}
