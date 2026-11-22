'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Issue } from '@/lib/data';
import { Icon } from '@/components/ui/icons';
import { DataStatusBadge } from '@/components/ui/DataStatusBadge';
import { createClient } from '@/lib/supabaseAuth/client';

export type VoteTarget = Pick<Issue, 'id' | 'for' | 'against' | 'unsure'> & { isSample?: boolean };

export function VotePanel({ issue, returnPath }: { issue: VoteTarget; returnPath?: string }) {
  const router = useRouter();
  const [vote, setVote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sample = issue.isSample === true;

  // Show the vote this user already cast (the function answers for the caller only).
  useEffect(() => {
    if (sample) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: cast } = await supabase.rpc('my_bill_vote', { p_bill_id: issue.id });
      if (active && typeof cast === 'string') setVote((current) => current ?? cast);
    })().catch(() => { /* the panel still works without the earlier vote */ });
    return () => { active = false; };
  }, [issue.id, sample]);

  const opts = [
    { k: 'for', cls: 'for-opt', label: 'For', pct: issue.for, ico: 'up' },
    { k: 'against', cls: 'against-opt', label: 'Against', pct: issue.against, ico: 'down' },
    { k: 'unsure', cls: 'unsure-opt', label: 'Unsure', pct: issue.unsure, ico: 'question' },
  ];

  const cast = async (choice: string) => {
    if (sample || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push(`/login?redirect=${returnPath ?? `/issue/${issue.id}`}`);
        return;
      }
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ billId: issue.id, vote: choice }),
      });
      if (!res.ok) {
        let msg = res.status === 401 ? 'Please sign in again to vote.' : 'Your vote could not be recorded.';
        try { const b = await res.json(); if (b?.message && res.status !== 401) msg = b.message; } catch {}
        setError(msg);
        return;
      }
      setVote(choice);
      router.refresh?.();
    } catch {
      setError('Your vote could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel panel-pad votecard">
      <h3 className="panel-title">Cast your voice</h3>
      <p className="panel-sub">Civic test vote · signed-in account</p>
      {sample && <p className="signin-note"><DataStatusBadge status="sample" /></p>}
      <div className="vopts">
        {opts.map(o => (
          <button key={o.k} disabled={sample} className={'vopt ' + o.cls + (vote === o.k ? ' sel' : '')}
            onClick={() => cast(o.k)}>
            <i className="fillbar" style={{ width: o.pct + '%' }} />
            <span className="vleft"><span className="vico"><Icon name={o.ico} size={16} stroke={2.4} /></span>{o.label}</span>
            <span className="vpct">{o.pct}%</span>
          </button>
        ))}
      </div>
      {error && <p className="signin-note" role="alert">{error}</p>}
      {sample
        ? <p className="signin-note">Voting opens when this issue is linked to a sourced bill.</p>
        : vote
          ? <div className="voted-note"><Icon name="check" size={15} stroke={2.4} /> Your voice is counted as <b>{vote}</b> · change anytime</div>
          : <p className="signin-note">Select an option above to add your voice. You will be asked to sign in.</p>}
    </div>
  );
}
