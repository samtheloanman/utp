'use client';

import { useProposalsCount, useProposal } from '@/lib/hooks';

function ProposalItem({ proposalId }: { proposalId: bigint }) {
    const { data: proposal, isLoading } = useProposal(proposalId);

    if (isLoading) {
        return <div>Loading proposal...</div>;
    }

    if (!proposal) {
        return null;
    }

    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Proposal ID: {proposalId.toString()}</h3>
            {/* Display more proposal details here */}
        </div>
    );
}

export function ProposalList() {
    const { data: proposalsCount, isLoading } = useProposalsCount();

    if (isLoading) {
        return (
            <div className="card">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Proposals</h2>
                <div>Loading proposals...</div>
            </div>
        );
    }

    const count = proposalsCount ? Number(proposalsCount) : 0;

    return (
        <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Proposals ({count})</h2>
            {count === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem',
                }}>
                    No proposals yet. Connect your wallet and create the first one.
                </div>
            ) : (
                <div>
                    {Array.from({ length: count }, (_, i) => (
                        <ProposalItem key={i} proposalId={BigInt(i)} />
                    ))}
                </div>
            )}
        </div>
    );
}
