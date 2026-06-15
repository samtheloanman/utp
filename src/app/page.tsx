'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SCALES, CATEGORIES, ISSUES } from '@/lib/data';
import { TopBar, IssueCard, fmt } from '@/components/ui/Shared';
import { Icon } from '@/components/ui/icons';
import { useWriteContract } from 'wagmi';
import { UTP_POLLING_ADDRESS, UTP_POLLING_ABI } from '@/lib/contracts';

export default function FeedView() {
  const router = useRouter();
  
  // App state
  const [scale, setScale] = useState('all');
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  
  const [votes, setVotes] = useState<Record<string, string>>({});
  const { writeContract } = useWriteContract();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('utp_votes');
      if (saved) setVotes(JSON.parse(saved));
    } catch {}
    
    // Set theme variables on mount
    const r = document.documentElement;
    r.setAttribute('data-palette', 'civic');
    r.setAttribute('data-density', 'comfortable');
    r.setAttribute('data-display', 'grotesk');
    r.setAttribute('data-photos', 'on');
  }, []);

  const onVote = (id: string, v: string) => {
    // 1=for, 2=against, 3=unsure
    const voteMap: Record<string, number> = { 'for': 1, 'against': 2, 'unsure': 3 };
    const voteType = voteMap[v];

    writeContract({
      address: UTP_POLLING_ADDRESS,
      abi: UTP_POLLING_ABI,
      functionName: 'castVote',
      args: [id, voteType],
    }, {
      onSuccess: () => {
        setVotes(prev => {
          const next = { ...prev, [id]: prev[id] === v ? undefined : v };
          if (next[id] === undefined) delete next[id];
          try { localStorage.setItem('utp_votes', JSON.stringify(next)); } catch {}
          return next as Record<string, string>;
        });
      },
      onError: (err) => {
        console.error('Failed to vote:', err);
        alert('Failed to vote on-chain. Make sure you are connected to the right network.');
      }
    });
  };

  const counts = useMemo(() => {
    const byScale: Record<string, number> = { all: ISSUES.length };
    SCALES.forEach(s => { 
      if (s.key !== 'all') byScale[s.key] = ISSUES.filter(i => i.scale === s.key).length; 
    });
    const q = query.trim().toLowerCase();
    const filtered = ISSUES.filter(i =>
      (scale === 'all' || i.scale === scale) &&
      (cat === 'All' || i.category === cat) &&
      (!q || (i.question + ' ' + i.region + ' ' + i.category).toLowerCase().includes(q))
    );
    return { ...byScale, _filtered: filtered } as any;
  }, [scale, cat, query]);

  const totalVoices = useMemo(() => ISSUES.reduce((s, i) => s + i.voices, 0), []);

  const goOpen = (id: string) => { 
    router.push('/issue/' + id); 
  };
  
  const goHome = () => { 
    setScale('all'); 
    setCat('All'); 
    setQuery(''); 
  };

  const showHero = scale === 'all' && cat === 'All' && !query;
  const activeScaleMeta = SCALES.find(s => s.key === scale) || { label: '' };

  return (
    <div className="app">
      <TopBar 
        query={query} 
        onQuery={(v) => setQuery(v)} 
        onHome={goHome} 
      />

      <div className="scalebar">
        <div className="scalebar-inner">
          {SCALES.map(s => (
            <button key={s.key} className={'scaletab' + (scale === s.key ? ' active' : '')} onClick={() => setScale(s.key)}>
              <span className="ico"><Icon name={s.ico} size={17} stroke={1.9} /></span>{s.label}
              <span className="cnt">{counts[s.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="catrow">
        <span className="catrow-lead"><Icon name="filter" size={14} stroke={1.9} /></span>
        {CATEGORIES.map(c => (
          <button key={c} className={'catchip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="wrap">
        {showHero && (
          <div className="hero">
            <div className="hero-photo" />
            <div className="hero-veil" />
            <div className="hero-content">
              <span className="hero-eyebrow"><span className="live-dot" /> {fmt(totalVoices)} voices · {ISSUES.length} live issues</span>
              <h1>Vote on what shapes your world</h1>
              <p>From your city council to the United Nations, weigh in on the decisions that matter — every claim backed by neutral, citation-grounded evidence.</p>
              <div className="hstats">
                <span className="hstat"><b>{fmt(totalVoices)}</b><span><Icon name="users" size={13} stroke={1.9} /> Voices cast</span></span>
                <span className="hstat"><b>{ISSUES.length}</b><span><Icon name="layers" size={13} stroke={1.9} /> Open issues</span></span>
                <span className="hstat"><b>4</b><span><Icon name="global" size={13} stroke={1.9} /> Local → global</span></span>
                <span className="hstat"><b className="accent-num">100%</b><span><Icon name="shield" size={13} stroke={1.9} /> Sources cited</span></span>
              </div>
            </div>
          </div>
        )}

        <div className="section-head">
          <h2>{scale === 'all' ? 'Trending now' : activeScaleMeta.label + ' issues'}</h2>
          <span className="sub">{counts[scale]} {counts[scale] === 1 ? 'issue' : 'issues'}{cat !== 'All' ? ' · ' + cat : ''}{query ? ' · “' + query + '”' : ''}</span>
        </div>

        {counts._filtered.length === 0
          ? <div className="empty"><Icon name="search" size={28} stroke={1.6} /><p>No issues match. Try a different scale or category.</p></div>
          : <div className="feed-grid">
              {counts._filtered.map(issue => (
                <IssueCard key={issue.id} issue={issue} vote={votes[issue.id]} onVote={onVote} onOpen={goOpen} />
              ))}
            </div>}
      </div>
    </div>
  );
}