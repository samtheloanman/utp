import { describe, expect, it } from 'vitest';
import { deduplicateArticles } from './dedup';

const articles = [
  { id: 'a', title: 'Council approves a new transit plan', source: 'Outlet A', bias: 3 },
  { id: 'b', title: 'Council approves a new transit plan!', source: 'Outlet B', bias: 1 },
  { id: 'c', title: 'State senate debates water funding', source: 'Outlet C', bias: 2 },
];

describe('news deduplication', () => {
  it('groups matching titles across sources and retains the lowest bias score as primary', () => {
    const clusters = deduplicateArticles(articles, 0.55, article => article.bias);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].primary.id).toBe('b');
    expect(clusters[0].duplicates.map(article => article.id)).toEqual(['a']);
    expect(clusters[0].sourceCount).toBe(2);
  });

  it('does not merge unrelated legislative stories', () => {
    const clusters = deduplicateArticles(articles, 0.55);
    expect(clusters[1].primary.id).toBe('c');
    expect(clusters[1].duplicates).toEqual([]);
  });
});
