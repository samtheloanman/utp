'use client';

export default function GovernancePage() {
    return (
        <div className="animate-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
                    🏛️ DAO Governance
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Create proposals, vote with UTP tokens, and execute DAO actions.
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Quorum', value: '4%', tag: 'of total supply' },
                    { label: 'Voting Period', value: '100', tag: 'blocks' },
                    { label: 'Proposals', value: '0', tag: 'total' },
                    { label: 'Your Voting Power', value: '—', tag: 'delegate to activate' },
                ].map((s) => (
                    <div key={s.label} className="card">
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.tag}</div>
                    </div>
                ))}
            </div>

            {/* Create Proposal */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Create Proposal</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            Target Contract Address
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            ETH Value (optional)
                        </label>
                        <input
                            type="text"
                            placeholder="0"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                        Submit Proposal
                    </button>
                </div>
            </div>

            {/* Proposals List */}
            <div className="card">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Proposals</h2>
                <div style={{
                    textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem',
                }}>
                    No proposals yet. Connect your wallet and create the first one.
                </div>
            </div>
        </div>
    );
}
