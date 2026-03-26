'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Bill {
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

const COUNTRIES = [
  { code: 'US', name: '🇺🇸 United States', api: 'Congress.gov' },
  { code: 'UK', name: '🇬🇧 United Kingdom', api: 'Parliament API' },
  { code: 'EU', name: '🇪🇺 European Union', api: 'EUR-Lex' },
  { code: 'BR', name: '🇧🇷 Brazil', api: 'camara.leg.br' },
  { code: 'IN', name: '🇮🇳 India', api: 'data.gov.in' },
];

const STATUS_COLORS: Record<string, string> = {
  'Passed House': 'tag-green', 'Enacted': 'tag-green', 'Royal Assent': 'tag-green',
  'Committee': 'tag-blue', 'Committee Stage': 'tag-blue', 'Trilogue': 'tag-blue',
  'Introduced': 'tag-btc', 'Draft': 'tag-btc',
};

export default function LegislaturePage() {
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBills() {
      setLoading(true);
      try {
        const res = await fetch(`/api/legislature?country=${selectedCountry}`);
        if (res.ok) {
          const data = await res.json();
          setBills(data.bills || []);
        }
      } catch (err) {
        console.error('Failed to fetch bills:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBills();
  }, [selectedCountry]);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          ⚖️ Legislature Tracker
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Track legislation across 5 countries. Vote on bills that matter to you.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="stat-value">5</div>
          <div className="stat-label">Countries</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--btc-orange)' }}>{bills.length}</div>
          <div className="stat-label">Bills Tracked</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {COUNTRIES.find(c => c.code === selectedCountry)?.api || '—'}
          </div>
          <div className="stat-label">Data Source</div>
        </div>
      </div>

      {/* Country Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {COUNTRIES.map((c) => (
          <button key={c.code} onClick={() => setSelectedCountry(c.code)}
            className={selectedCountry === c.code ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Bills List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading legislation data...
        </div>
      ) : bills.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No bills found for this country.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bills.map((bill) => (
            <Link key={bill.id} href={`/bill/${bill.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className={`tag ${STATUS_COLORS[bill.status] || 'tag-btc'}`}>
                    {bill.status}
                  </span>
                  <span className="tag" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {bill.chamber}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--btc-orange)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  {bill.number}
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                  {bill.title}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Sponsor: {bill.sponsor} · Introduced: {bill.introduced}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--btc-orange)' }}>
                    Vote →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
