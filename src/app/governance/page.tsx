'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { useGovernanceQuorum, useCreateProposal, useUTPVotingPower, getAddresses } from '@/lib/hooks';
import { ProposalList } from '@/components/ProposalList';

export default function GovernancePage() {
    const { isConnected, chainId } = useAccount();
    const addrs = getAddresses(chainId);
    const { data: quorum } = useGovernanceQuorum();
    const { data: votingPower } = useUTPVotingPower();
    const { createProposal, isPending: creating, isSuccess: created, error: createError } = useCreateProposal();

    const [target, setTarget] = useState('');
    const [rbtcValue, setRbtcValue] = useState('');
    const [calldata, setCalldata] = useState('0x');

    // Note: the GovernancePlugin contract exposes proposals as a public array
    // but the ABI getter takes an index. We can't enumerate count without a custom getter.
    // For now, we show the most recent proposals if any exist.

    // Read voting period
    const { data: votingPeriod } = useReadContract({
        address: addrs.GovernancePlugin as Address,
        abi: GovernancePluginABI,
        functionName: 'votingPeriod',
    });

    const vPeriod = votingPeriod ? Number(votingPeriod) : 100;
    const quorumPct = quorum ? `${Number(quorum) / 100}%` : '4%';
    const vpDisplay = votingPower ? (Number(votingPower) / 1e18).toFixed(0) : '—';

    const handleSubmit = () => {
        if (!target) return;
        const val = rbtcValue ? parseEther(rbtcValue) : BigInt(0);
        createProposal(target as Address, val, (calldata || '0x') as `0x${string}`);
    };

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
                    { label: 'Quorum', value: quorumPct, tag: 'of total supply' },
                    { label: 'Voting Period', value: String(vPeriod), tag: 'blocks' },
                    { label: 'Proposals', value: '—', tag: 'total' },
                    { label: 'Your Voting Power', value: isConnected ? vpDisplay : '—', tag: 'delegate to activate' },
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
                {createError && (
                    <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontSize: '0.8rem' }}>
                        {createError.message?.substring(0, 120)}
                    </div>
                )}
                {created && (
                    <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontSize: '0.8rem' }}>
                        ✅ Proposal submitted successfully!
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            Target Contract Address
                        </label>
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
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
                            RBTC Value (optional)
                        </label>
                        <input
                            type="text"
                            value={rbtcValue}
                            onChange={(e) => setRbtcValue(e.target.value)}
                            placeholder="0"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            Calldata (optional)
                        </label>
                        <input
                            type="text"
                            value={calldata}
                            onChange={(e) => setCalldata(e.target.value)}
                            placeholder="0x"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 8, alignSelf: 'flex-start' }}
                        disabled={creating || !isConnected || !target}
                        onClick={handleSubmit}
                    >
                        {!isConnected ? 'Connect Wallet' : creating ? 'Submitting...' : 'Submit Proposal'}
                    </button>
                </div>
            </div>

            <ProposalList />
        </div>
    );
}

