'use client';

import { useAccount } from 'wagmi';
import { formatEther, type Address } from 'viem';
import {
  useUTPBalance, useUTPTotalSupply, useUTPVotingPower,
  useUTPDelegate, useUTPTransfer,
} from '@/lib/hooks';
import { useState } from 'react';

export default function TokenPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useUTPBalance();
  const { data: totalSupply } = useUTPTotalSupply();
  const { data: votingPower } = useUTPVotingPower();
  const { delegate, isPending: delegating } = useUTPDelegate();
  const { transfer, isPending: transferring } = useUTPTransfer();

  const [delegateAddr, setDelegateAddr] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmt, setTransferAmt] = useState('');

  const fmtShort = (v: bigint | undefined) => {
    if (!v) return '—';
    const n = Number(formatEther(v));
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(2);
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          🔶 UTP Token
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          ERC-20 governance token with voting power, delegation, and gasless permits.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Supply', value: fmtShort(totalSupply as bigint | undefined), color: 'var(--btc-orange)' },
          { label: 'Your Balance', value: isConnected ? fmtShort(balance as bigint | undefined) : '—', color: 'var(--text-primary)' },
          { label: 'Voting Power', value: isConnected ? fmtShort(votingPower as bigint | undefined) : '—', color: 'var(--green)' },
          { label: 'Max Supply', value: '1B', color: 'var(--blue)' },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Delegate */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Delegate Votes</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
            Activate your voting power by delegating to yourself or another address.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={delegateAddr}
              onChange={(e) => setDelegateAddr(e.target.value)}
              placeholder="Delegate address (or self)"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '0.85rem',
              }}
            />
            <button
              className="btn btn-primary"
              disabled={delegating || !delegateAddr}
              onClick={() => delegate(delegateAddr as Address)}
            >
              {delegating ? '...' : 'Delegate'}
            </button>
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 8, width: '100%' }}
            disabled={delegating || !address}
            onClick={() => address && delegate(address)}
          >
            {delegating ? 'Delegating...' : 'Self-Delegate'}
          </button>
        </div>

        {/* Transfer */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Transfer UTP</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="Recipient address"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '0.85rem',
              }}
            />
            <input
              type="number"
              value={transferAmt}
              onChange={(e) => setTransferAmt(e.target.value)}
              placeholder="Amount"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '0.85rem',
              }}
            />
            <button
              className="btn btn-secondary"
              disabled={transferring || !transferTo || !transferAmt}
              onClick={() => transfer(transferTo as Address, transferAmt)}
            >
              {transferring ? 'Sending...' : 'Transfer'}
            </button>
          </div>
        </div>
      </div>

      {/* Token Info */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Token Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem' }}>
          {[
            ['Name', 'Universal Transaction Protocol'],
            ['Symbol', 'UTP'],
            ['Decimals', '18'],
            ['Max Supply', '1,000,000,000'],
            ['Current Supply', fmtShort(totalSupply as bigint | undefined)],
            ['ERC20Votes', '✅ Enabled'],
            ['ERC20Permit', '✅ Enabled'],
            ['Minting', 'DAO-permissioned only'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
