'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ThumbsUp, ThumbsDown, HelpCircle, Loader2 } from 'lucide-react';

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

      const { data, error } = await supabase
        .from('shadow_votes')
        .select('vote')
        .eq('bill_id', billId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setVote(data.vote as any);
      }
    } catch (err) {
      console.error('Error fetching vote:', err);
    } finally {
      setFetching(false);
    }
  };

  const fetchAggregates = async () => {
    try {
      const { data, error } = await supabase
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

      // We use a server action or edge function ideally for IP hashing.
      // For this UI component, we'll assume the storage is handled via a server-side call.
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
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Shadow Voting</h3>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => castVote('for')}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 transition-all ${
              vote === 'for'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <ThumbsUp size={18} />
            <span className="font-medium">For</span>
          </button>

          <button
            onClick={() => castVote('against')}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 transition-all ${
              vote === 'against'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <ThumbsDown size={18} />
            <span className="font-medium">Against</span>
          </button>

          <button
            onClick={() => castVote('unsure')}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 transition-all ${
              vote === 'unsure'
                ? 'bg-zinc-600 text-white shadow-md'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <HelpCircle size={18} />
            <span className="font-medium">Unsure</span>
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>Community Sentiment</span>
            <span>{aggregates.total_votes} total votes</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="bg-green-600 transition-all duration-500"
              style={{ width: `${aggregates.total_votes ? (aggregates.count_for / aggregates.total_votes) * 100 : 0}%` }}
            />
            <div
              className="bg-red-600 transition-all duration-500"
              style={{ width: `${aggregates.total_votes ? (aggregates.count_against / aggregates.total_votes) * 100 : 0}%` }}
            />
            <div
              className="bg-zinc-500 transition-all duration-500"
              style={{ width: `${aggregates.total_votes ? (aggregates.count_unsure / aggregates.total_votes) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{Math.round(aggregates.total_votes ? (aggregates.count_for / aggregates.total_votes) * 100 : 0)}% For</span>
            <span>{Math.round(aggregates.total_votes ? (aggregates.count_against / aggregates.total_votes) * 100 : 0)}% Against</span>
          </div>
        </div>
      </div>
    </div>
  );
}
