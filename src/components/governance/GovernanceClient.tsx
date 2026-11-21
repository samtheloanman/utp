'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  FileCode2,
  Landmark,
  Layers,
  Send,
  ShieldAlert,
  Vote,
  Wallet,
  X,
} from 'lucide-react';
import {
  encodeFunctionData,
  formatEther,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import {
  APP_CONFIG_ABI,
  GOVERNOR_STORAGE_ABI,
  UTP_TOKEN_VOTES_ABI,
} from '@/lib/contracts';
import type {
  DaoOverview,
  DaoProposalSummary,
} from '@/modules/dao-chain/types';

export interface GovernanceClientProps {
  overview: DaoOverview;
}

function formatTokenAmount(weiStr: string): string {
  try {
    const num = Number(formatEther(BigInt(weiStr)));
    if (!Number.isFinite(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } catch {
    return '0';
  }
}

function shortenHex(value: string | null | undefined, lead = 8, tail = 6): string {
  if (!value) return '—';
  if (value.length <= lead + tail + 2) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

function stateBadgeColors(state: DaoProposalSummary['state']): {
  background: string;
  color: string;
  borderColor: string;
} {
  if (state === 'Active' || state === 'Pending') {
    return {
      background: 'var(--primary-soft)',
      color: 'var(--primary-deep)',
      borderColor: 'var(--primary)',
    };
  }
  if (state === 'Succeeded' || state === 'Queued' || state === 'Executed') {
    return {
      background: 'var(--for-soft)',
      color: 'var(--for)',
      borderColor: 'var(--for)',
    };
  }
  if (state === 'Canceled' || state === 'Defeated' || state === 'Expired') {
    return {
      background: 'var(--against-soft)',
      color: 'var(--against)',
      borderColor: 'var(--against)',
    };
  }
  return {
    background: 'var(--unsure-soft)',
    color: 'var(--unsure)',
    borderColor: 'var(--border)',
  };
}

export function GovernanceClient({ overview }: GovernanceClientProps) {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const {
    writeContract,
    data: lastTxHash,
    error: writeError,
    isPending: isWriting,
  } = useWriteContract();

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [configKeyInput, setConfigKeyInput] = useState('civic.banner');
  const [configValueInput, setConfigValueInput] = useState('approved-by-dao');
  const [proposalDescription, setProposalDescription] = useState(
    'DIP-1: Update civic.banner via UtPTimelock'
  );

  const tokenAddress = overview.tokenAddress as Address | null;
  const governorAddress = overview.governorAddress as Address | null;
  const appConfigAddress = overview.appConfigAddress as Address | null;

  const { data: rawBalance } = useReadContract({
    address: tokenAddress ?? undefined,
    abi: UTP_TOKEN_VOTES_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: overview.chainId,
    query: { enabled: Boolean(isConnected && address && tokenAddress) },
  });

  const { data: rawVotes } = useReadContract({
    address: tokenAddress ?? undefined,
    abi: UTP_TOKEN_VOTES_ABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    chainId: overview.chainId,
    query: { enabled: Boolean(isConnected && address && tokenAddress) },
  });

  const ZERO_BI = BigInt(0);
  const walletBalanceBig = typeof rawBalance === 'bigint' ? rawBalance : ZERO_BI;
  const walletVotesBig = typeof rawVotes === 'bigint' ? rawVotes : ZERO_BI;
  const needsDelegation =
    isConnected && walletBalanceBig > ZERO_BI && walletVotesBig === ZERO_BI;
  const isWrongChain =
    isConnected &&
    walletChainId !== undefined &&
    walletChainId !== overview.chainId;
  const canSubmitWrites =
    overview.isConfigured && isConnected && !isWrongChain && !isWriting;

  const selectedProposal = useMemo(
    () =>
      overview.proposals.find((p) => p.proposalId === selectedProposalId) ??
      null,
    [overview.proposals, selectedProposalId]
  );

  const activeProposalCount = useMemo(
    () => overview.proposals.filter((p) => p.state === 'Active').length,
    [overview.proposals]
  );

  const computedKeyHash: Hex = useMemo(() => {
    const trimmed = configKeyInput.trim() || 'civic.banner';
    return keccak256(toHex(trimmed));
  }, [configKeyInput]);

  const statusBadge = useMemo(() => {
    if (overview.status === 'live') {
      return {
        label: 'Live Chain Data',
        bg: 'var(--for-soft)',
        fg: 'var(--for)',
        border: 'var(--for)',
      };
    }
    if (overview.status === 'unavailable') {
      return {
        label: 'DAO RPC Unavailable',
        bg: 'var(--against-soft)',
        fg: 'var(--against)',
        border: 'var(--against)',
      };
    }
    return {
      label: 'Preview / Contracts Not Deployed',
      bg: 'var(--accent-soft)',
      fg: 'var(--ink)',
      border: 'var(--accent)',
    };
  }, [overview.status]);

  function handleConnectWallet() {
    const primaryConnector = connectors[0];
    if (primaryConnector) {
      connect({ connector: primaryConnector });
    }
  }

  function handleDelegateSelf() {
    if (!canSubmitWrites || !tokenAddress || !address) return;
    writeContract({
      address: tokenAddress,
      abi: UTP_TOKEN_VOTES_ABI,
      functionName: 'delegate',
      args: [address],
      chainId: overview.chainId,
    });
  }

  function handleCastVote(proposalId: string, support: 0 | 1 | 2) {
    if (!canSubmitWrites || !governorAddress) return;
    writeContract({
      address: governorAddress,
      abi: GOVERNOR_STORAGE_ABI,
      functionName: 'castVote',
      args: [BigInt(proposalId), support],
      chainId: overview.chainId,
    });
  }

  function handleQueueProposal(proposalId: string) {
    if (!canSubmitWrites || !governorAddress) return;
    writeContract({
      address: governorAddress,
      abi: GOVERNOR_STORAGE_ABI,
      functionName: 'queue',
      args: [BigInt(proposalId)],
      chainId: overview.chainId,
    });
  }

  function handleExecuteProposal(proposalId: string) {
    if (!canSubmitWrites || !governorAddress) return;
    writeContract({
      address: governorAddress,
      abi: GOVERNOR_STORAGE_ABI,
      functionName: 'execute',
      args: [BigInt(proposalId)],
      chainId: overview.chainId,
    });
  }

  function handleCreateProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitWrites || !governorAddress || !appConfigAddress) return;
    const trimmedDesc = proposalDescription.trim();
    if (!trimmedDesc) return;

    const encodedCall = encodeFunctionData({
      abi: APP_CONFIG_ABI,
      functionName: 'setConfig',
      args: [computedKeyHash, configValueInput],
    });

    writeContract({
      address: governorAddress,
      abi: GOVERNOR_STORAGE_ABI,
      functionName: 'propose',
      args: [[appConfigAddress], [ZERO_BI], [encodedCall], trimmedDesc],
      chainId: overview.chainId,
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="btn btn-ghost btn-sm">
            <ArrowLeft size={15} />
            Civic Feed
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              data-testid="network-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--r-pill)',
                background: 'var(--primary-soft)',
                color: 'var(--primary-deep)',
                border: '1px solid var(--border-2)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <Landmark size={14} />
              {overview.networkLabel}
            </span>

            <span
              data-testid="chain-data-status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--r-pill)',
                background: statusBadge.bg,
                color: statusBadge.fg,
                border: `1px solid ${statusBadge.border}`,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {overview.status === 'live' ? (
                <CheckCircle2 size={14} />
              ) : (
                <ShieldAlert size={14} />
              )}
              {statusBadge.label}
            </span>
          </div>

          <div className="topbar-actions">
            {!isConnected ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConnectWallet}
                disabled={isConnecting || connectors.length === 0}
              >
                <Wallet size={15} />
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : (
              <span
                className="mono"
                style={{
                  fontSize: '0.78rem',
                  padding: '6px 11px',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink-soft)',
                }}
              >
                {shortenHex(address, 6, 4)}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="wrap">
        <section style={{ marginBottom: '22px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--primary-deep)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '4px 11px',
              borderRadius: 'var(--r-pill)',
              marginBottom: '10px',
            }}
          >
            <Vote size={13} />
            Binding On-Chain Token Governance · Test Tokens Only
          </div>
          <h1 style={{ fontSize: '2.1rem', margin: '0 0 8px', color: 'var(--ink)' }}>
            UTP Protocol Governance
          </h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', maxWidth: '72ch', lineHeight: 1.55 }}>
            Timelocked OpenZeppelin Governor proposals enumerated directly from on-chain{' '}
            <span className="mono">GovernorStorage</span> state without trusting off-chain event
            indexers. Passed proposals execute only after the{' '}
            <span className="mono">UtPTimelock</span> delay.
          </p>
        </section>

        {isWrongChain && (
          <div
            role="alert"
            data-testid="wrong-chain-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '14px 18px',
              marginBottom: '18px',
              borderRadius: 'var(--r-md)',
              background: 'var(--against-soft)',
              border: '1px solid var(--against)',
              color: 'var(--ink)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} style={{ color: 'var(--against)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Wallet connected to Chain <span className="mono">{walletChainId}</span>. Switch to
                Chain <span className="mono">{overview.chainId}</span> before signing transactions.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => switchChain({ chainId: overview.chainId })}
              disabled={isSwitchingChain}
            >
              {isSwitchingChain
                ? 'Switching…'
                : `Switch to Chain ${overview.chainId}`}
            </button>
          </div>
        )}

        {overview.status === 'unavailable' && (
          <div
            role="alert"
            style={{
              padding: '14px 18px',
              marginBottom: '18px',
              borderRadius: 'var(--r-md)',
              background: 'var(--against-soft)',
              border: '1px solid var(--against)',
              color: 'var(--ink)',
              fontSize: '0.9rem',
            }}
          >
            <strong>DAO state unavailable:</strong>{' '}
            {overview.errorMessage || 'Unable to reach chain RPC.'} Cached defaults are never
            substituted.
          </div>
        )}

        {/* 4 KPI Summary Cards */}
        <section
          aria-label="Governance Metrics"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '14px',
            marginBottom: '22px',
          }}
        >
          <div className="panel panel-pad" data-testid="kpi-proposals">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--muted)',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span>On-Chain Proposals</span>
              <Layers size={15} />
            </div>
            <div
              className="mono"
              style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '8px' }}
            >
              {overview.proposals.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
              <span className="mono">{activeProposalCount}</span> active ·{' '}
              {overview.isConfigured ? 'GovernorStorage eth_call' : 'Not deployed'}
            </div>
          </div>

          <div className="panel panel-pad" data-testid="kpi-blocks">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--muted)',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span>Confirmed Block</span>
              <Clock size={15} />
            </div>
            <div
              className="mono"
              style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '8px' }}
            >
              {overview.confirmedBlock !== null
                ? `#${overview.confirmedBlock.toLocaleString('en-US')}`
                : '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
              Head{' '}
              <span className="mono">
                {overview.latestBlock !== null
                  ? `#${overview.latestBlock.toLocaleString('en-US')}`
                  : '—'}
              </span>{' '}
              · <span className="mono">{overview.confirmationBlocks}</span>-block confirmation
            </div>
          </div>

          <div className="panel panel-pad" data-testid="kpi-quorum">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--muted)',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span>Quorum Requirement</span>
              <Landmark size={15} />
            </div>
            <div
              className="mono"
              style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '8px' }}
            >
              400,000 UTP
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
              <span className="mono">4%</span> of <span className="mono">10M</span> test tokens ·
              2-voter threshold
            </div>
          </div>

          <div className="panel panel-pad" data-testid="kpi-voting-power">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--muted)',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span>Your Voting Weight</span>
              <Coins size={15} />
            </div>
            <div
              className="mono"
              style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '8px' }}
            >
              {isConnected
                ? `${formatTokenAmount(walletVotesBig.toString())} UTP`
                : 'Not Connected'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
              {isConnected ? (
                needsDelegation ? (
                  <span style={{ color: 'var(--against)', fontWeight: 600 }}>
                    Balance {formatTokenAmount(walletBalanceBig.toString())} UTP · Delegate first
                  </span>
                ) : (
                  <span>
                    Balance{' '}
                    <span className="mono">
                      {formatTokenAmount(walletBalanceBig.toString())}
                    </span>{' '}
                    UTP
                  </span>
                )
              ) : (
                'Connect wallet to delegate, propose, or vote'
              )}
            </div>
          </div>
        </section>

        {/* Main Split: Responsive Proposal Table + Interactive Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: selectedProposal
              ? 'minmax(0, 1.75fr) minmax(320px, 1fr)'
              : 'minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'start',
            marginBottom: '24px',
          }}
        >
          <section className="panel" aria-label="On-Chain Proposals Table">
            <div
              className="panel-pad"
              style={{
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 className="panel-title">Proposal Registry</h2>
                <p className="panel-sub" style={{ marginBottom: 0 }}>
                  Governor:{' '}
                  <span className="mono">
                    {overview.governorAddress
                      ? shortenHex(overview.governorAddress, 10, 8)
                      : 'Unconfigured'}
                  </span>{' '}
                  · Timelock:{' '}
                  <span className="mono">
                    {overview.timelockAddress
                      ? shortenHex(overview.timelockAddress, 10, 8)
                      : 'Unconfigured'}
                  </span>
                </p>
              </div>
            </div>

            {overview.proposals.length === 0 ? (
              <div className="empty" data-testid="empty-proposals-state">
                <Landmark size={30} style={{ color: 'var(--muted)' }} />
                <p style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  {overview.status === 'unconfigured'
                    ? 'Preview Mode — Governance Contracts Not Deployed Yet'
                    : overview.status === 'unavailable'
                      ? 'Unable to Load On-Chain Proposals'
                      : 'No On-Chain Proposals Submitted Yet'}
                </p>
                <p style={{ maxWidth: '52ch', fontSize: '0.88rem' }}>
                  {overview.status === 'unconfigured'
                    ? 'No synthetic or placeholder proposals are shown. Set NEXT_PUBLIC_GOVERNOR_ADDRESS and NEXT_PUBLIC_APP_CONFIG_ADDRESS after deploying to Rootstock Testnet (Chain 31) or UTP Alpha-Net.'
                    : 'Submit an AppConfig proposal below after delegating UTP test token voting weight.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.88rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: 'var(--surface-2)',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        fontSize: '0.73rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--muted)',
                      }}
                    >
                      <th style={{ padding: '12px 18px' }}>Proposal</th>
                      <th style={{ padding: '12px 14px' }}>Decoded Action</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>For / Against</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.proposals.map((proposal) => {
                      const badge = stateBadgeColors(proposal.state);
                      const isSelected =
                        proposal.proposalId === selectedProposalId;
                      return (
                        <tr
                          key={proposal.proposalId}
                          data-testid={`proposal-row-${proposal.proposalId}`}
                          style={{
                            borderBottom: '1px solid var(--hairline)',
                            background: isSelected
                              ? 'var(--primary-soft)'
                              : 'var(--surface)',
                          }}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div className="mono" style={{ fontWeight: 700 }}>
                              #{proposal.index} · {shortenHex(proposal.proposalId, 6, 4)}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--muted)',
                                marginTop: '2px',
                              }}
                            >
                              {proposal.isConfirmed
                                ? `Confirmed (${proposal.confirmationDepth}+ blocks)`
                                : 'Pending 2-block confirmation'}
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div
                              className={
                                proposal.decodedSummary === 'Unrecognized calldata'
                                  ? ''
                                  : 'mono'
                              }
                              style={{
                                fontWeight: 600,
                                color:
                                  proposal.decodedSummary ===
                                  'Unrecognized calldata'
                                    ? 'var(--against)'
                                    : 'var(--ink)',
                              }}
                            >
                              {proposal.decodedSummary}
                            </div>
                            {proposal.description && (
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--muted)',
                                  marginTop: '3px',
                                }}
                              >
                                {proposal.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 'var(--r-pill)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: badge.background,
                                color: badge.color,
                                border: `1px solid ${badge.borderColor}`,
                              }}
                            >
                              {proposal.state}
                            </span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div className="mono" style={{ fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--for)', fontWeight: 700 }}>
                                {formatTokenAmount(proposal.forVotesWei)}
                              </span>{' '}
                              /{' '}
                              <span
                                style={{ color: 'var(--against)', fontWeight: 700 }}
                              >
                                {formatTokenAmount(proposal.againstVotesWei)}
                              </span>{' '}
                              UTP
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                                justifyContent: 'flex-end',
                              }}
                            >
                              {proposal.state === 'Active' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={!canSubmitWrites}
                                    onClick={() =>
                                      handleCastVote(proposal.proposalId, 1)
                                    }
                                  >
                                    Vote For
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={!canSubmitWrites}
                                    onClick={() =>
                                      handleCastVote(proposal.proposalId, 0)
                                    }
                                  >
                                    Vote Against
                                  </button>
                                </>
                              )}
                              {proposal.state === 'Succeeded' && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={!canSubmitWrites}
                                  onClick={() =>
                                    handleQueueProposal(proposal.proposalId)
                                  }
                                >
                                  Queue
                                </button>
                              )}
                              {proposal.state === 'Queued' && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={!canSubmitWrites}
                                  onClick={() =>
                                    handleExecuteProposal(proposal.proposalId)
                                  }
                                >
                                  Execute
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() =>
                                  setSelectedProposalId(
                                    isSelected ? null : proposal.proposalId
                                  )
                                }
                              >
                                <FileCode2 size={14} />
                                {isSelected ? 'Close' : 'Inspect'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Slide-In Calldata & Evidence Inspection Drawer */}
          {selectedProposal && (
            <aside
              role="dialog"
              aria-label="Proposal Calldata & Evidence Drawer"
              data-testid="calldata-drawer"
              className="panel panel-pad"
              style={{ position: 'sticky', top: '80px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--primary-deep)',
                    }}
                  >
                    Calldata & Evidence Verification
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem' }}>
                    Proposal #{selectedProposal.index}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close drawer"
                  className="btn btn-quiet btn-sm"
                  onClick={() => setSelectedProposalId(null)}
                >
                  <X size={16} />
                </button>
              </div>

              {selectedProposal.decodedSummary === 'Unrecognized calldata' && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--against-soft)',
                    border: '1px solid var(--against)',
                    color: 'var(--ink)',
                    fontSize: '0.82rem',
                    marginBottom: '14px',
                  }}
                >
                  <strong>Unrecognized calldata:</strong> This proposal does not
                  match the standard <span className="mono">AppConfig.setConfig</span>{' '}
                  template. Verify raw target and hex calldata before voting.
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--muted)', fontWeight: 600 }}>
                    Proposal ID (uint256)
                  </div>
                  <div
                    className="mono"
                    style={{ wordBreak: 'break-all', color: 'var(--ink)' }}
                  >
                    {selectedProposal.proposalId}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--muted)', fontWeight: 600 }}>
                    Description Hash (keccak256)
                  </div>
                  <div
                    className="mono"
                    style={{ wordBreak: 'break-all', color: 'var(--ink)' }}
                  >
                    {selectedProposal.descriptionHash}
                  </div>
                </div>

                {selectedProposal.etaTimestamp !== null && (
                  <div>
                    <div style={{ color: 'var(--muted)', fontWeight: 600 }}>
                      Timelock Execution ETA (Unix)
                    </div>
                    <div className="mono">{selectedProposal.etaTimestamp}</div>
                  </div>
                )}

                {selectedProposal.actions.map((action, idx) => (
                  <div
                    key={`${action.target}-${idx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                      Action #{idx + 1}: {action.summary}
                    </div>
                    <div style={{ color: 'var(--muted)' }}>
                      Target:{' '}
                      <span
                        className="mono"
                        style={{ color: 'var(--ink)', wordBreak: 'break-all' }}
                      >
                        {action.target}
                      </span>
                    </div>
                    <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                      Value: <span className="mono">{action.valueWei} wei</span>
                    </div>
                    <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                      Raw Calldata:
                    </div>
                    <div
                      className="mono"
                      style={{
                        marginTop: '3px',
                        padding: '7px 9px',
                        borderRadius: 'var(--r-sm)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        wordBreak: 'break-all',
                        fontSize: '0.76rem',
                      }}
                    >
                      {action.calldata}
                    </div>
                  </div>
                ))}

                <div style={{ paddingTop: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginBottom: '5px',
                    }}
                  >
                    <span style={{ color: 'var(--for)' }}>
                      For: {formatTokenAmount(selectedProposal.forVotesWei)} UTP
                    </span>
                    <span style={{ color: 'var(--against)' }}>
                      Against: {formatTokenAmount(selectedProposal.againstVotesWei)}{' '}
                      UTP
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      Abstain: {formatTokenAmount(selectedProposal.abstainVotesWei)}{' '}
                      UTP
                    </span>
                  </div>
                  {selectedProposal.state === 'Active' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!canSubmitWrites}
                        onClick={() =>
                          handleCastVote(selectedProposal.proposalId, 1)
                        }
                      >
                        Cast For
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={!canSubmitWrites}
                        onClick={() =>
                          handleCastVote(selectedProposal.proposalId, 0)
                        }
                      >
                        Cast Against
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={!canSubmitWrites}
                        onClick={() =>
                          handleCastVote(selectedProposal.proposalId, 2)
                        }
                      >
                        Abstain
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Interactive Wagmi Actions: Self-Delegation + AppConfig Proposal Builder */}
        <section
          aria-label="On-Chain Governance Actions"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '20px',
          }}
        >
          <div className="panel panel-pad">
            <h2 className="panel-title">1. Activate Voting Power (Delegate)</h2>
            <p className="panel-sub">
              OpenZeppelin <span className="mono">ERC20Votes</span> snapshots voting
              weight at proposal creation. Holders must call{' '}
              <span className="mono">delegate()</span> before a proposal is submitted.
            </p>
            <button
              type="button"
              data-testid="delegate-button"
              className="btn btn-primary"
              disabled={!canSubmitWrites || !tokenAddress}
              onClick={handleDelegateSelf}
            >
              <Coins size={16} />
              Delegate Voting Power to Self
            </button>
          </div>

          <form className="panel panel-pad" onSubmit={handleCreateProposal}>
            <h2 className="panel-title">2. Propose AppConfig Update</h2>
            <p className="panel-sub">
              Submits a deterministic{' '}
              <span className="mono">AppConfig.setConfig(bytes32, string)</span>{' '}
              action for <span className="mono">UtPTimelock</span> execution.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Config Key
                <input
                  type="text"
                  value={configKeyInput}
                  onChange={(e) => setConfigKeyInput(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 11px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                  }}
                />
                <span
                  className="mono"
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    color: 'var(--muted)',
                    marginTop: '3px',
                  }}
                >
                  keccak256: {shortenHex(computedKeyHash, 14, 10)}
                </span>
              </label>

              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Config Value
                <input
                  type="text"
                  value={configValueInput}
                  onChange={(e) => setConfigValueInput(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 11px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                  }}
                />
              </label>

              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Proposal Description
                <input
                  type="text"
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 11px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                  }}
                />
              </label>
            </div>

            <button
              type="submit"
              data-testid="propose-button"
              className="btn btn-primary"
              disabled={!canSubmitWrites || !governorAddress || !appConfigAddress}
            >
              <Send size={15} />
              Submit On-Chain Proposal
            </button>

            {lastTxHash && (
              <p
                className="mono"
                style={{
                  marginTop: '10px',
                  fontSize: '0.76rem',
                  color: 'var(--for)',
                }}
              >
                Submitted tx: {lastTxHash}
              </p>
            )}
            {writeError && (
              <p
                role="alert"
                style={{
                  marginTop: '10px',
                  fontSize: '0.78rem',
                  color: 'var(--against)',
                }}
              >
                {writeError.message}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
