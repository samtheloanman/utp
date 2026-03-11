'use client';

import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import {
  useStablecoinPosition, useCollateralRatio, useTotalCollateral,
  useDeposit, useRedeem, useUBTCBalance,
} from '@/lib/hooks';
import { useState } from 'react';

export default function StablecoinPage() {
  const { isConnected } = useAccount();
  const { data: position } = useStablecoinPosition();
  const { data: ratio } = useCollateralRatio();
  const { data: totalCollateral } = useTotalCollateral();
  const { data: ubtcBalance } = useUBTCBalance();
  const { deposit, isPending: depositing } = useDeposit();
  const { redeem, isPending: redeeming } = useRedeem();

  const [rbtcAmt, setRbtcAmt] = useState('');
  const [mintAmt, setMintAmt] = useState('');
  const [redeemAmt, setRedeemAmt] = useState('');

  const fmt = (v: bigint | undefined) => v ? Number(formatEther(v)).toFixed(4) : '—';
  const fmtRatio = (v: bigint | undefined) => {
    if (!v) return '—';
    if (v === BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')) return '∞';
    return `${(Number(v) / 100).toFixed(1)}%`;
  };

  // Position data: position returns [collateral, debt]
  const collateral = position ? (position as [bigint, bigint])[0] : undefined;
  const debt = position ? (position as [bigint, bigint])[1] : undefined;

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          🪙 UBTC Stablecoin
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Deposit RBTC as collateral and mint UBTC. Maintain healthy collateral ratios.
        </p>
      </div>

      {/* Protocol Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Collateral', value: fmt(totalCollateral as bigint | undefined), tag: 'RBTC locked', color: 'var(--btc-orange)' },
          { label: 'Your UBTC', value: isConnected ? fmt(ubtcBalance as bigint | undefined) : '—', tag: 'balance', color: 'var(--green)' },
          { label: 'Your Ratio', value: isConnected ? fmtRatio(ratio as bigint | undefined) : '—', tag: 'collateral health', color: 'var(--blue)' },
          { label: 'Liquidation', value: '120%', tag: 'threshold', color: 'var(--red)' },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.tag}</div>
          </div>
        ))}
      </div>

      {/* Deposit / Redeem */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Deposit & Mint</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>RBTC Collateral</label>
              <input type="number" value={rbtcAmt} onChange={(e) => setRbtcAmt(e.target.value)} placeholder="0.0 RBTC"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>UBTC to Mint</label>
              <input type="number" value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="0.0 UBTC"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }}
              disabled={depositing || !rbtcAmt || !mintAmt}
              onClick={() => deposit(rbtcAmt, mintAmt)}>
              {depositing ? 'Depositing...' : 'Deposit & Mint'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Redeem & Withdraw</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>UBTC to Burn</label>
              <input type="number" value={redeemAmt} onChange={(e) => setRedeemAmt(e.target.value)} placeholder="0.0 UBTC"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
            </div>
            <div className="card" style={{ padding: '0.75rem', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Your collateral</span>
                <span style={{ fontWeight: 600 }}>{isConnected ? fmt(collateral) : '—'} RBTC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Your debt</span>
                <span style={{ fontWeight: 600 }}>{isConnected ? fmt(debt) : '—'} UBTC</span>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 8 }}
              disabled={redeeming || !redeemAmt}
              onClick={() => redeem(redeemAmt)}>
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
