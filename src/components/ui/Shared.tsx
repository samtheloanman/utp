'use client';

import React, { useState } from 'react';
import { SCALES, CATEGORIES, Issue, photoUrl } from '@/lib/data';
import { Icon, BrandMark, Flag, CAT_COLOR } from './icons';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function scaleMeta(key: string) { 
  return SCALES.find(s => s.key === key) || { key: '', label: '', ico: '' }; 
}

export function Media({ id, cat, ratio = '16 / 9', children }: { id: string, cat: string, ratio?: string, children?: React.ReactNode }) {
  const [ok, setOk] = useState(true);
  const color = CAT_COLOR[cat] || '#0E7C96';
  return (
    <div className="media" style={{ '--cat': color, aspectRatio: ratio } as React.CSSProperties}>
      <div className="media-bg" />
      <div className="media-watermark"><Icon name={cat} size={64} stroke={1.3} /></div>
      {id && ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="media-img" src={photoUrl(id, 700)} alt="" loading="lazy"
          referrerPolicy="no-referrer" onError={() => setOk(false)} onLoad={() => setOk(true)} />
      )}
      <div className="media-shade" />
      {children}
    </div>
  );
}

export function Sparkline({ data, w = 64, h = 24, color }: { data: number[], w?: number, h?: number, color?: string }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = Math.max(1, max - min);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const up = data[data.length - 1] >= data[0];
  const c = color || (up ? 'var(--for)' : 'var(--against)');
  const gid = 'sg' + Math.round(pts[0][1] * 1000) + data.length;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d + ` L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={c} />
    </svg>
  );
}

export function SentimentBar({ issue, showLegend = true }: { issue: Issue, showLegend?: boolean }) {
  return (
    <div>
      <div className="sbar">
        <i className="s-for" style={{ width: issue.for + '%' }} />
        <i className="s-against" style={{ width: issue.against + '%' }} />
        <i className="s-unsure" style={{ width: issue.unsure + '%' }} />
      </div>
      {showLegend && (
        <div className="sbar-legend">
          <span style={{ color: 'var(--for)' }}>{issue.for}% For</span>
          <span style={{ color: 'var(--against)' }}>{issue.against}% Against</span>
          <span>{issue.unsure}% Unsure</span>
        </div>
      )}
    </div>
  );
}

export function TrendChart({ data, height = 220 }: { data: number[], height?: number }) {
  const w = 720, h = height, padL = 6, padR = 6, padT = 16, padB = 22;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const pts = data.map((v, i) => [padL + (i / (data.length - 1)) * innerW, padT + (1 - v / 100) * innerH]);
  function smooth(p: number[][]) {
    let d = `M ${p[0][0]} ${p[0][1]}`;
    for (let i = 1; i < p.length; i++) {
      const x0 = p[i - 1][0], y0 = p[i - 1][1], x1 = p[i][0], y1 = p[i][1], cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }
  const line = smooth(pts);
  const area = line + ` L ${pts[pts.length - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--for)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--for)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(g => {
          const y = padT + (1 - g / 100) * innerH;
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--hairline)" strokeWidth="1" />
              <text x={w - padR} y={y - 4} textAnchor="end" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="var(--faint)">{g}%</text>
            </g>
          );
        })}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="var(--for)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4.5" fill="var(--for)" stroke="var(--surface)" strokeWidth="2" />
      </svg>
    </div>
  );
}

export function QuickVote({ issue, vote, onVote }: { issue: Issue, vote: string | null, onVote: (id: string, vote: string) => void }) {
  return (
    <div className="qv" onClick={(e) => e.stopPropagation()}>
      <button className={'qv-btn qv-for' + (vote === 'for' ? ' sel' : '')} onClick={() => onVote(issue.id, 'for')}>
        <Icon name="up" size={15} stroke={2.2} /> For <span className="qv-pct">{issue.for}%</span>
      </button>
      <button className={'qv-btn qv-against' + (vote === 'against' ? ' sel' : '')} onClick={() => onVote(issue.id, 'against')}>
        <Icon name="down" size={15} stroke={2.2} /> Against <span className="qv-pct">{issue.against}%</span>
      </button>
    </div>
  );
}

export function IssueCard({ issue, vote, onVote, onOpen }: { issue: Issue, vote: string | null, onVote: (id: string, vote: string) => void, onOpen: (id: string) => void }) {
  const sm = scaleMeta(issue.scale);
  return (
    <article className="icard" onClick={() => onOpen(issue.id)}>
      <Media id={issue.img} cat={issue.category}>
        <div className="media-chips">
          <span className="mchip"><Icon name={sm.ico} size={13} stroke={2} />{sm.label}</span>
          <span className="mchip"><Icon name={issue.category} size={13} stroke={2} />{issue.category}</span>
        </div>
        <div className="media-region">
          <Flag cc={issue.cc || undefined} size={18} />{issue.region}
        </div>
      </Media>

      <div className="icard-body">
        <h3 className="icard-q">{issue.question}</h3>

        <div className="icard-pct">
          <span className="big">{issue.for}<span className="pct-sym">%</span></span>
          <span className="lbl">lean&nbsp;For</span>
          <span className="icard-spark"><Sparkline data={issue.history} /></span>
        </div>

        <SentimentBar issue={issue} />
        <QuickVote issue={issue} vote={vote} onVote={onVote} />

        <div className="icard-foot">
          <span className="icard-voices"><Icon name="users" size={14} stroke={1.9} /><b>{fmt(issue.voices)}</b> voices</span>
          <span className="deadline"><Icon name="clock" size={13} stroke={1.9} />{issue.deadline}</span>
        </div>
      </div>
    </article>
  );
}

export function TopBar({ query, onQuery, onHome }: { query?: string, onQuery?: (q: string) => void, onHome?: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand" onClick={onHome} style={{ cursor: 'pointer' }}>
          <BrandMark size={36} />
          <div className="brand-name">
            <b>Uniting the People</b>
            <span>Make your voice heard</span>
          </div>
        </div>

        <div className="searchbox">
          <Icon name="search" size={16} stroke={2} />
          <input 
            value={query || ''} 
            onChange={(e) => onQuery && onQuery(e.target.value)} 
            placeholder="Search issues, places, topics" 
          />
        </div>

        <div className="topbar-actions">
          <button className="btn btn-quiet btn-sm"><Icon name="shield" size={15} stroke={1.9} />How it works</button>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
