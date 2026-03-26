'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther, type Address } from 'viem';
import { useEventCount, useStakeVote, getAddresses } from '@/lib/hooks';
import { EventMarketABI } from '@/lib/contracts';

export default function EventsPage() {
    const { isConnected, chainId } = useAccount();
    const addrs = getAddresses(chainId);
    const [stakeAmounts, setStakeAmounts] = useState<Record<string, string>>({});

    const { data: eventCount } = useEventCount();
    const { stakeVote, isPending: staking, isSuccess: staked, error: stakeError } = useStakeVote();

    const eCount = eventCount ? Number(eventCount) : 0;

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
                    <div className="stat-value">{eCount}</div>
                    <div className="stat-label">Active Events</div>
                </div>
                <div className="card">
                    <div className="stat-value" style={{ color: 'var(--btc-orange)' }}>—</div>
                    <div className="stat-label">UTP Staked</div>
                </div>
                <div className="card">
                    <div className="stat-value" style={{ color: 'var(--green)' }}>
                        {isConnected ? '✅' : '—'}
                    </div>
                    <div className="stat-label">{isConnected ? 'Connected' : 'Connect Wallet'}</div>
                </div>
            </div>

            {stakeError && (
                <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontSize: '0.8rem' }}>
                    {stakeError.message?.substring(0, 120)}
                </div>
            )}
            {staked && (
                <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontSize: '0.8rem' }}>
                    ✅ Vote staked successfully!
                </div>
            )}

            {/* Events List */}
            {eCount === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No events created yet. Events are created on-chain via the EventMarket contract.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Array.from({ length: eCount }, (_, i) => (
                        <EventCard
                            key={i}
                            eventId={i}
                            marketAddr={addrs.EventMarket as Address}
                            stakeAmt={stakeAmounts[i] || ''}
                            onStakeAmtChange={(v) => setStakeAmounts((p) => ({ ...p, [i]: v }))}
                            onStake={(optionIndex) => stakeVote(BigInt(i), BigInt(optionIndex), stakeAmounts[i] || '0')}
                            staking={staking}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface EventCardProps {
    eventId: number;
    marketAddr: Address;
    stakeAmt: string;
    onStakeAmtChange: (v: string) => void;
    onStake: (optionIndex: number) => void;
    staking: boolean;
}

function EventCard({ eventId, marketAddr, stakeAmt, onStakeAmtChange, onStake, staking }: EventCardProps) {
    const { isConnected } = useAccount();

    const { data: eventData } = useReadContract({
        address: marketAddr,
        abi: EventMarketABI,
        functionName: 'events',
        args: [BigInt(eventId)],
    });

    if (!eventData) return null;

    const evt = eventData as unknown as {
        description: string;
        regionTag: string;
        numOptions: bigint;
        totalStaked: bigint;
        deadline: bigint;
        resolved: boolean;
    };

    const optionCount = Number(evt.numOptions || BigInt(0));
    const totalStaked = Number(formatEther(evt.totalStaked || BigInt(0))).toFixed(0);
    const deadline = evt.deadline ? new Date(Number(evt.deadline) * 1000).toLocaleDateString() : '—';

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span className="tag tag-btc">{evt.regionTag || 'GLOBAL'}</span>
                        <span className="tag tag-green">{optionCount} options</span>
                        {evt.resolved && <span className="tag" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>Resolved</span>}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 }}>
                        {evt.description || `Event #${eventId}`}
                    </h3>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--btc-orange)' }}>
                        {totalStaked}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        UTP Staked
                    </div>
                </div>
            </div>

            {/* Options */}
            {!evt.resolved && (
                <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {Array.from({ length: optionCount }, (_, i) => (
                            <button
                                key={i}
                                className="btn btn-secondary"
                                style={{ flex: 1, fontSize: '0.8rem' }}
                                disabled={staking || !isConnected || !stakeAmt}
                                onClick={() => onStake(i)}
                            >
                                Option {i + 1}
                            </button>
                        ))}
                    </div>

                    {/* Stake Input */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            type="number"
                            value={stakeAmt}
                            onChange={(e) => onStakeAmtChange(e.target.value)}
                            placeholder="Amount (UTP)"
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '0.85rem',
                            }}
                        />
                    </div>
                </>
            )}

            <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Deadline: {deadline}
            </div>
        </div>
    );
}
