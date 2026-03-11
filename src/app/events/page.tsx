'use client';

import { useState } from 'react';

const MOCK_EVENTS = [
    {
        id: 0,
        description: 'Will the US pass the Stablecoin Transparency Act by 2026?',
        regionTag: 'US',
        numOptions: 2,
        options: ['Yes', 'No'],
        totalStaked: '125,000',
        deadline: '2026-06-01',
        resolved: false,
    },
    {
        id: 1,
        description: 'Will the EU finalize MiCA implementation by Q2 2026?',
        regionTag: 'EU',
        numOptions: 2,
        options: ['Yes', 'No'],
        totalStaked: '89,500',
        deadline: '2026-07-01',
        resolved: false,
    },
    {
        id: 2,
        description: 'Will India legalize BTC as a payment method?',
        regionTag: 'IN',
        numOptions: 3,
        options: ['Yes', 'No', 'Partial'],
        totalStaked: '200,000',
        deadline: '2026-12-31',
        resolved: false,
    },
];

const REGIONS = ['ALL', 'US', 'EU', 'IN', 'GLOBAL'];

export default function EventsPage() {
    const [regionFilter, setRegionFilter] = useState('ALL');

    const filtered = regionFilter === 'ALL'
        ? MOCK_EVENTS
        : MOCK_EVENTS.filter((e) => e.regionTag === regionFilter);

    return (
        <div className="animate-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
                    📊 Event Voting
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Stake UTP tokens on global event outcomes. Correct voters share the pool.
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <div className="stat-value">3</div>
                    <div className="stat-label">Active Events</div>
                </div>
                <div className="card">
                    <div className="stat-value" style={{ color: 'var(--btc-orange)' }}>414.5K</div>
                    <div className="stat-label">UTP Staked</div>
                </div>
                <div className="card">
                    <div className="stat-value" style={{ color: 'var(--green)' }}>3</div>
                    <div className="stat-label">Regions Active</div>
                </div>
            </div>

            {/* Region Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
                {REGIONS.map((r) => (
                    <button
                        key={r}
                        onClick={() => setRegionFilter(r)}
                        className={regionFilter === r ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Events Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filtered.map((evt) => (
                    <div key={evt.id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <span className="tag tag-btc">{evt.regionTag}</span>
                                    <span className="tag tag-green">{evt.numOptions} options</span>
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 }}>
                                    {evt.description}
                                </h3>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 120 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--btc-orange)' }}>
                                    {evt.totalStaked}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    UTP Staked
                                </div>
                            </div>
                        </div>

                        {/* Options */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            {evt.options.map((opt, i) => (
                                <button key={i} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}>
                                    {opt}
                                </button>
                            ))}
                        </div>

                        {/* Stake Input */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder="Amount (UTP)"
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    color: 'var(--text-primary)', fontSize: '0.85rem',
                                }}
                            />
                            <button className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                                Stake Vote
                            </button>
                        </div>

                        <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Deadline: {evt.deadline}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
