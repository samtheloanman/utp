'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ShadowVoteProps {
  billId: string;
}

export default function ShadowVote({ billId }: ShadowVoteProps) {
  const [vote, setVote] = useState<'for' | 'against' | 'unsure' | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregates, setAggregates] = useState({
    count_for: 0,
    count_against: 0,
    count_unsure: 0,
    total_votes: 0,
  });

  useEffect(() => {
    fetchVote();
    fetchAggregates();
  }, [billId]);

  const fetchVote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFetching(false);
        return;
      }

      const { data } = await supabase
        .from('shadow_votes')
        .select('vote')
        .eq('bill_id', billId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setVote(data.vote as 'for' | 'against' | 'unsure');
      }
    } catch (err) {
      console.error('Error fetching vote:', err);
    } finally {
      setFetching(false);
    }
  };

  const fetchAggregates = async () => {
    try {
      const { data } = await supabase
        .from('vote_aggregates')
        .select('*')
        .eq('bill_id', billId)
        .single();

      if (data) {
        setAggregates(data);
      }
    } catch (err) {
      console.error('Error fetching aggregates:', err);
    }
  };

  const castVote = async (selectedVote: 'for' | 'against' | 'unsure') => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to vote.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, vote: selectedVote }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to cast vote');
      }

      setVote(selectedVote);
      fetchAggregates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  const forPct = aggregates.total_votes ? Math.round((aggregates.count_for / aggregates.total_votes) * 100) : 0;
  const againstPct = aggregates.total_votes ? Math.round((aggregates.count_against / aggregates.total_votes) * 100) : 0;
  const unsurePct = aggregates.total_votes ? Math.round((aggregates.count_unsure / aggregates.total_votes) * 100) : 0;

  return (
    <div className="card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Shadow Voting</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Vote buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => castVote('for')}
            disabled={loading}
            className={vote === 'for' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              ...(vote === 'for' ? { background: 'var(--green)', borderColor: 'var(--green)' } : {}),
            }}
          >
            👍 <span style={{ fontWeight: 500 }}>For</span>
          </button>

          <button
            onClick={() => castVote('against')}
            disabled={loading}
            className={vote === 'against' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              ...(vote === 'against' ? { background: 'var(--red)', borderColor: 'var(--red)' } : {}),
            }}
          >
            👎 <span style={{ fontWeight: 500 }}>Against</span>
          </button>

          <button
            onClick={() => castVote('unsure')}
            disabled={loading}
            className={vote === 'unsure' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            🤷 <span style={{ fontWeight: 500 }}>Unsure</span>
          </button>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontSize: '0.8rem',
          }}>
            {error}
          </div>
        )}

        {/* Sentiment bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Community Sentiment</span>
            <span>{aggregates.total_votes} total votes</span>
          </div>
          <div style={{
            height: 8, borderRadius: 4, overflow: 'hidden',
            display: 'flex', background: 'var(--bg-elevated)',
          }}>
            <div style={{
              width: `${forPct}%`,
              background: 'var(--green)',
              transition: 'width 0.5s ease',
            }} />
            <div style={{
              width: `${againstPct}%`,
              background: 'var(--red)',
              transition: 'width 0.5s ease',
            }} />
            <div style={{
              width: `${unsurePct}%`,
              background: 'var(--text-muted)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            <span>{forPct}% For</span>
            <span>{againstPct}% Against</span>
          </div>
        </div>
      </div>
    </div>
  );
}
