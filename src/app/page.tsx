'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import {
  useUTPTotalSupply, useUTPBalance, useUTPVotingPower,
  useEventCount, useTotalCollateral,
} from '@/lib/hooks';

export default function OverviewPage() {
  const { isConnected } = useAccount();

  const { data: totalSupply } = useUTPTotalSupply();
  const { data: balance } = useUTPBalance();
  const { data: votingPower } = useUTPVotingPower();
  const { data: eventCount } = useEventCount();
  const { data: totalCollateral } = useTotalCollateral();

  const fmt = (v: bigint | undefined) => {
    if (!v) return '—';
    const n = Number(formatEther(v));
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(2);
  };

  const STATS = [
    { label: 'Smart Contracts', value: '11', sub: 'Deployed', color: 'var(--text-primary)' },
    { label: 'UTP Supply', value: fmt(totalSupply as bigint | undefined), sub: 'Total Minted', color: 'var(--btc-orange)' },
    { label: 'Proposals', value: '—', sub: 'Governance', color: 'var(--blue)' },
    { label: 'Events', value: eventCount ? String(Number(eventCount)) : '0', sub: 'Prediction Markets', color: 'var(--green)' },
  ];

  const MODULES = [
    {
      title: 'DAO Governance',
      icon: '🏛️',
      href: '/governance',
      stats: [
        { label: 'Proposals', value: '—' },
        { label: 'Your VP', value: isConnected ? fmt(votingPower as bigint | undefined) : '—' },
      ],
      description: 'Create proposals, vote with UTP tokens, execute via quorum.',
      color: 'var(--btc-orange)',
    },
    {
      title: 'Event Voting',
      icon: '📊',
      href: '/events',
      stats: [
        { label: 'Active Events', value: eventCount ? String(Number(eventCount)) : '—' },
        { label: 'Total Staked', value: '—' },
      ],
      description: 'Polymarket-style prediction markets on world events.',
      color: 'var(--blue)',
    },
    {
      title: 'UBTC Stablecoin',
      icon: '🪙',
      href: '/stablecoin',
      stats: [
        { label: 'Total Collateral', value: fmt(totalCollateral as bigint | undefined) },
        { label: 'UBTC Supply', value: '—' },
      ],
      description: 'BTC-backed stablecoin with collateral vault and liquidation.',
      color: 'var(--green)',
    },
    {
      title: 'UTP Token',
      icon: '🔶',
      href: '/token',
      stats: [
        { label: 'Total Supply', value: fmt(totalSupply as bigint | undefined) },
        { label: 'Your Balance', value: isConnected ? fmt(balance as bigint | undefined) : '—' },
      ],
      description: 'Governance token with voting power, delegation, and permits.',
      color: 'var(--btc-orange)',
    },
    {
      title: 'News Hub',
      icon: '📰',
      href: '/news',
      stats: [
        { label: 'Source', value: 'GDELT' },
        { label: 'Updates', value: 'Live' },
      ],
      description: 'Aggregated world news with AI fact-checking and bias scoring.',
      color: 'var(--yellow)',
    },
    {
      title: 'Legislature',
      icon: '⚖️',
      href: '/legislature',
      stats: [
        { label: 'Countries', value: '5' },
        { label: 'Shadow Vote', value: '✅' },
      ],
      description: 'Track legislation from USA, UK, EU, Brazil, and India.',
      color: 'var(--blue)',
    },
  ];

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}>
          Universal Transaction Protocol
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Decentralized governance, prediction markets, BTC-backed stablecoin, and global transparency — on Rootstock (Bitcoin L2).
        </p>
      </div>

      {/* Protocol Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {STATS.map((stat) => (
          <div key={stat.label} className="card">
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>
        {MODULES.map((mod) => (
          <Link key={mod.href} href={mod.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{mod.icon}</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{mod.title}</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {mod.description}
              </p>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {mod.stats.map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: mod.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
