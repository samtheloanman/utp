'use client';

import { useState, useEffect } from 'react';

interface AggregatedArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  url: string;
  region: string;
  category: string;
  bias: string;
  factuality: string;
  biasScore: number;
  isVoteable: boolean;
  provider: string;
}

interface AggregateResponse {
  articles: AggregatedArticle[];
  voteable: AggregatedArticle[];
  total: number;
  voteableCount: number;
  sources_used: string[];
  bias_distribution: Record<string, number>;
}

const BIAS_COLORS: Record<string, string> = {
  'center': '#22C55E',
  'center-left': '#EAB308',
  'center-right': '#EAB308',
  'left': '#F97316',
  'right': '#F97316',
  'far-left': '#EF4444',
  'far-right': '#EF4444',
  'unknown': '#6B7280',
};

const BIAS_LABELS: Record<string, string> = {
  'center': 'Center',
  'center-left': 'Lean Left',
  'center-right': 'Lean Right',
  'left': 'Left',
  'right': 'Right',
  'far-left': 'Far Left',
  'far-right': 'Far Right',
  'unknown': 'Unrated',
};

type BiasFilter = 'unbiased' | 'center-only' | 'all';

export default function NewsPage() {
  const [data, setData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [biasFilter, setBiasFilter] = useState<BiasFilter>('unbiased');
  const [showVoteable, setShowVoteable] = useState(false);
  const [proposing, setProposing] = useState<string | null>(null);
  const [proposed, setProposed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNews();
  }, [biasFilter]);

  async function fetchNews() {
    setLoading(true);
    try {
      const res = await fetch(`/api/aggregate?bias=${biasFilter}${showVoteable ? '&voteable=true' : ''}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch aggregated news:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePropose(article: AggregatedArticle) {
    setProposing(article.id);
    try {
      const res = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          sourceUrl: article.url,
          bias: article.bias,
          category: article.category,
        }),
      });
      if (res.ok || res.status === 409) {
        setProposed((prev) => new Set(prev).add(article.id));
      }
    } catch (err) {
      console.error('Failed to propose:', err);
    } finally {
      setProposing(null);
    }
  }

  const articles = showVoteable ? (data?.voteable || []) : (data?.articles || []);

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          📰 News Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Unbiased news aggregation from {data?.sources_used?.length || 0} sources. Items flagged for voting are highlighted.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="stat-value">{data?.total || '—'}</div>
          <div className="stat-label">Articles</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--btc-orange)' }}>{data?.voteableCount || 0}</div>
          <div className="stat-label">Voteable Items</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{data?.sources_used?.length || 0}</div>
          <div className="stat-label">Sources</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ fontSize: '1rem' }}>
            {data?.sources_used?.join(', ') || '—'}
          </div>
          <div className="stat-label">Active Feeds</div>
        </div>
      </div>

      {/* Bias Distribution */}
      {data?.bias_distribution && Object.keys(data.bias_distribution).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Bias Distribution</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(data.bias_distribution).map(([bias, count]) => (
              <div key={bias} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: BIAS_COLORS[bias] || '#6B7280',
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {BIAS_LABELS[bias] || bias}: {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['center-only', 'unbiased', 'all'] as BiasFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setBiasFilter(f)}
            className={biasFilter === f ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {f === 'center-only' ? '🎯 Center Only' : f === 'unbiased' ? '⚖️ All Unbiased' : '🌐 All Sources'}
          </button>
        ))}
        <div style={{ borderLeft: '1px solid var(--border)', margin: '0 4px' }} />
        <button
          onClick={() => setShowVoteable(!showVoteable)}
          className={showVoteable ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          🗳️ Voteable Only {data?.voteableCount ? `(${data.voteableCount})` : ''}
        </button>
      </div>

      {/* Articles */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Aggregating from multiple sources...
        </div>
      ) : articles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No articles found matching your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {articles.map((article) => (
            <div
              key={article.id}
              className="card"
              style={{
                borderLeft: article.isVoteable ? '3px solid var(--btc-orange)' : undefined,
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Bias dot */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 999,
                  background: `${BIAS_COLORS[article.bias]}20`,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: BIAS_COLORS[article.bias] || '#6B7280',
                  }} />
                  <span style={{ fontSize: '0.65rem', color: BIAS_COLORS[article.bias], fontWeight: 500 }}>
                    {BIAS_LABELS[article.bias] || article.bias}
                  </span>
                </div>

                <span className="tag" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {article.source}
                </span>

                {article.isVoteable && (
                  <span className="tag tag-btc">🗳️ Voteable</span>
                )}

                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {article.provider}
                </span>
              </div>

              {/* Title + Description */}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
                  {article.title}
                </h3>
              </a>
              {article.description && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                  {article.description.substring(0, 200)}
                  {article.description.length > 200 ? '...' : ''}
                </p>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(article.publishedAt).toLocaleDateString()} · {article.region} · {article.category}
                </span>

                {article.isVoteable && (
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                    disabled={proposing === article.id || proposed.has(article.id)}
                    onClick={() => handlePropose(article)}
                  >
                    {proposed.has(article.id) ? '✅ Proposed' : proposing === article.id ? '...' : '🗳️ Propose to Vote'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
