'use client';

import { useState, useEffect } from 'react';

interface Article {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  region: string;
  category: string;
}

const CATEGORIES = ['ALL', 'World', 'General', 'Technology', 'Economy', 'Crypto', 'Finance', 'Politics'];

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/news?q=cryptocurrency+blockchain+legislation');
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const filtered = categoryFilter === 'ALL'
    ? articles
    : articles.filter((a) => a.category === categoryFilter);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          📰 News Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Aggregated world news with AI fact-checking, bias scoring, and community voting.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="stat-value">{articles.length}</div>
          <div className="stat-label">Articles</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {new Set(articles.map(a => a.source)).size}
          </div>
          <div className="stat-label">Sources</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--blue)' }}>
            {new Set(articles.map(a => a.region)).size}
          </div>
          <div className="stat-label">Regions</div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategoryFilter(c)}
            className={categoryFilter === c ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading articles from GDELT...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No articles found. Try a different category.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((article) => (
            <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className="tag tag-btc">{article.region}</span>
                  <span className="tag" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {article.category}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>
                  {article.title}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  {article.source} · {new Date(article.publishedAt).toLocaleDateString()}
                </div>
                {article.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {article.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
