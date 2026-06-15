'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ISSUES, Issue, makeActivity } from '@/lib/data';
import { scaleMeta, Media, SentimentBar, TrendChart, TopBar, fmt } from '@/components/ui/Shared';
import { Icon, BrandMark, Flag } from '@/components/ui/icons';
import { useAccount, useWriteContract } from 'wagmi';
import { UTP_POLLING_ADDRESS, UTP_POLLING_ABI } from '@/lib/contracts';

function VotePanel({ issue, vote, onVote }: { issue: Issue, vote: string | null, onVote: (id: string, vote: string) => void }) {
  const { isConnected } = useAccount();
  
  const opts = [
    { k: 'for', cls: 'for-opt', label: 'For', pct: issue.for, ico: 'up' },
    { k: 'against', cls: 'against-opt', label: 'Against', pct: issue.against, ico: 'down' },
    { k: 'unsure', cls: 'unsure-opt', label: 'Unsure', pct: issue.unsure, ico: 'question' },
  ];
  return (
    <div className="panel panel-pad votecard">
      <h3 className="panel-title">Cast your voice</h3>
      <p className="panel-sub">On-chain shadow vote · one voice per verified wallet</p>
      <div className="vopts">
        {opts.map(o => (
          <button key={o.k} className={'vopt ' + o.cls + (vote === o.k ? ' sel' : '')}
            onClick={() => isConnected ? onVote(issue.id, o.k) : alert('Please connect your wallet using the Top Bar to vote.')}>
            <i className="fillbar" style={{ width: o.pct + '%' }} />
            <span className="vleft"><span className="vico"><Icon name={o.ico} size={16} stroke={2.4} /></span>{o.label}</span>
            <span className="vpct">{o.pct}%</span>
          </button>
        ))}
      </div>
      {vote
        ? <div className="voted-note"><Icon name="check" size={15} stroke={2.4} /> Your voice is counted as <b>{vote}</b> · change anytime</div>
        : isConnected
          ? <p className="signin-note">Select an option above to add your voice.</p>
          : <p className="signin-note">Connect wallet to vote.</p>}
    </div>
  );
}

function AiDebate({ issue }: { issue: Issue }) {
  const [debate, setDebate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDebate() {
      try {
        const res = await fetch('/api/debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issueId: issue.id, question: issue.question })
        });
        if (res.ok) {
          const data = await res.json();
          setDebate(data);
        }
      } catch (err) {
        console.error('Failed to fetch debate:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDebate();
  }, [issue.id, issue.question]);

  const displayData = debate || issue;

  return (
    <div className="panel panel-pad">
      <div className="digest-head">
        <span className="digest-badge"><Icon name="spark" size={16} stroke={1.8} /></span>
        <div>
          <h3 className="panel-title">AI Citizen Digest</h3>
          <p className="panel-sub">Neutral, citation-grounded — generated, then human-reviewed</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <Icon name="loader" size={24} stroke={2} /> Generating debate...
        </div>
      ) : (
        <>
          <div className="digest-tldr">
            <span className="tldr-tag">TL;DR</span>
            <span dangerouslySetInnerHTML={{ __html: displayData.tldr }} />
          </div>

          <div className="debate-cols">
            <div className="debate-col for">
              <h4><Icon name="up" size={15} stroke={2.4} /> Arguments For</h4>
              {displayData.argsFor.map((a: any, i: number) => (
                <div className="arg" key={i}>
                  <span className="marker">{i + 1}</span>
                  <span>{a.t}<a className="cite" title={'Source: ' + a.cite}><Icon name="external" size={11} stroke={2} />{a.cite}</a></span>
                </div>
              ))}
            </div>
            <div className="debate-col against">
              <h4><Icon name="down" size={15} stroke={2.4} /> Arguments Against</h4>
              {displayData.argsAgainst.map((a: any, i: number) => (
                <div className="arg" key={i}>
                  <span className="marker">{i + 1}</span>
                  <span>{a.t}<a className="cite" title={'Source: ' + a.cite}><Icon name="external" size={11} stroke={2} />{a.cite}</a></span>
                </div>
              ))}
            </div>
          </div>

          <div className="digest-foot">
            <span className="conf-pill">
              <Icon name="shield" size={14} stroke={1.9} /> Grounding confidence
              <span className="conf-track"><i style={{ width: Math.round(displayData.confidence * 100) + '%' }} /></span>
              <span className="mono">{Math.round(displayData.confidence * 100)}%</span>
            </span>
            <span className="digest-note">Every claim links to a registered source.</span>
          </div>
        </>
      )}
    </div>
  );
}



function SourcesWidget({ issue }: { issue: Issue }) {
  return (
    <div className="widget">
      <h4 className="widget-title"><Icon name="shield" size={13} stroke={2} /> Source Registry</h4>
      {issue.sources.map((s, i) => (
        <div className="source" key={i}>
          <span className="favd"><Icon name={s.ico} size={17} stroke={1.8} /></span>
          <span className="sbody">
            <div className="sname">{s.name}</div>
            <div className="smeta">{s.meta}</div>
          </span>
          <span className="health" title={s.health}><span className="hdot" style={{ background: s.health === 'Healthy' ? 'var(--for)' : 'var(--accent)' }} />{s.health}</span>
        </div>
      ))}
    </div>
  );
}

function RelatedWidget({ issues, onOpen }: { issues: Issue[], onOpen: (id: string) => void }) {
  return (
    <div className="widget">
      <h4 className="widget-title"><Icon name="layers" size={13} stroke={2} /> Related issues</h4>
      <div className="related">
        {issues.map(r => (
          <div className="rel" key={r.id} onClick={() => onOpen(r.id)}>
            <span className="rel-thumb"><Flag cc={r.cc || undefined} size={20} /></span>
            <span className="rq">{r.question}</span>
            <span className="rpct">{r.for}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityWidget({ issue }: { issue: Issue }) {
  const [acts, setActs] = useState<{ name: string, v: string, verb: string, time: string }[]>([]);
  
  useEffect(() => {
    setActs(makeActivity(issue));
  }, [issue]);

  const ico: Record<string, string> = { for: 'up', against: 'down', unsure: 'question' };
  
  if (acts.length === 0) return null;

  return (
    <div className="widget">
      <h4 className="widget-title"><span className="live-dot" /> Live activity</h4>
      {acts.map((a, i) => (
        <div className="act" key={i}>
          <span className={'adot a-' + a.v}><Icon name={ico[a.v]} size={13} stroke={2.4} /></span>
          <span><b>{a.name}</b> {a.verb}</span>
          <span className="atime">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

export default function DetailView() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const issue = ISSUES.find(i => i.id === id);

  const [votes, setVotes] = useState<Record<string, string>>({});
  const { writeContract } = useWriteContract();
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('utp_votes');
      if (saved) setVotes(JSON.parse(saved));
    } catch {}
    
    const r = document.documentElement;
    r.setAttribute('data-palette', 'civic');
    r.setAttribute('data-density', 'comfortable');
    r.setAttribute('data-display', 'grotesk');
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

  if (!issue) {
    return (
      <div className="app">
        <TopBar onHome={() => router.push('/')} />
        <div className="wrap empty">
          <p>Issue not found.</p>
        </div>
      </div>
    );
  }

  const sm = scaleMeta(issue.scale);
  const vote = votes[issue.id] || null;
  
  const related = ISSUES.filter(i => i.id !== issue.id && (i.category === issue.category || i.scale === issue.scale)).slice(0, 4);
  const delta = issue.deltaWeek;

  return (
    <div className="app">
      <TopBar onHome={() => router.push('/')} />
      
      <div className="detail">
        {/* hero banner with photo */}
        <div className="dhero">
          <Media id={issue.img} cat={issue.category} ratio="auto">
            <div className="dhero-inner">
              <a className="backlink" onClick={() => router.push('/')}><Icon name="arrowLeft" size={16} stroke={2} /> All issues</a>
              <div className="dhero-chips">
                <span className="mchip solid"><Icon name={sm.ico} size={13} stroke={2} />{sm.label}</span>
                <span className="mchip solid"><Icon name={issue.category} size={13} stroke={2} />{issue.category}</span>
                <span className="mchip solid"><Flag cc={issue.cc || undefined} size={15} />{issue.region}</span>
                {issue.scope && <span className="mchip solid"><Icon name="doc" size={13} stroke={2} />{issue.scope}</span>}
                <span className="mchip live"><span className="live-dot" />Live</span>
              </div>
              <h1 className="dtitle">{issue.question}</h1>
              {issue.billNo && <div className="dbill mono">{issue.billNo}</div>}
            </div>
          </Media>
        </div>

        <div className="dmeta">
          <div className="m"><span className="k">Voices</span><span className="v">{fmt(issue.voices)}</span></div>
          <div className="m"><span className="k">Lean For</span><span className="v" style={{ color: 'var(--for)' }}>{issue.for}%</span></div>
          <div className="m"><span className="k">7-day shift</span><span className={'v ' + (delta >= 0 ? 'trend-up' : 'trend-down')}><Icon name={delta >= 0 ? 'up' : 'down'} size={14} stroke={2.4} />{Math.abs(delta)} pts</span></div>
          <div className="m"><span className="k">Status</span><span className="v vstatus">{issue.deadline}</span></div>
        </div>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="panel panel-pad">
              <div className="senthead">
                <span className="num">{issue.for}<span className="num-sym">%</span></span>
                <span className="cap">
                  <b>lean toward For</b>
                  <span className={delta >= 0 ? 'trend-up' : 'trend-down'}><Icon name={delta >= 0 ? 'trending' : 'down'} size={14} stroke={2.2} /> {Math.abs(delta)} pts this week</span>
                </span>
              </div>
              <TrendChart data={issue.history} />
              <div className="chart-legend">
                <span className="lg"><span className="sw" style={{ background: 'var(--for)' }} /> Share voting For over time</span>
                <span className="lg" style={{ marginLeft: 'auto' }}><Icon name="clock" size={13} stroke={1.9} /> Updated continuously</span>
              </div>
            </div>

            <div className="panel panel-pad" style={{ marginTop: 20 }}>
              <h3 className="panel-title">Where people stand</h3>
              <p className="panel-sub">{fmt(issue.voices)} verified voices so far</p>
              <SentimentBar issue={issue} />
            </div>

            <div style={{ marginTop: 20 }}><AiDebate issue={issue} /></div>
          </div>

          <aside className="detail-side">
            <VotePanel issue={issue} vote={vote} onVote={onVote} />
            <SourcesWidget issue={issue} />
            <ActivityWidget issue={issue} />
            <RelatedWidget issues={related} onOpen={(id) => router.push('/issue/' + id)} />
          </aside>
        </div>
      </div>
    </div>
  );
}
