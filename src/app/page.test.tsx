import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ login: vi.fn(), logout: vi.fn(), authenticated: false }) }));
vi.mock('@/components/ui/HeroCanvas', () => ({ HeroCanvas: () => null }));
vi.mock('gsap', () => ({ default: { context: () => ({ revert: () => {} }), fromTo: vi.fn(), from: vi.fn(), to: vi.fn() } }));

import FeedView from './page';
import { ISSUES } from '@/lib/data';

describe('home feed', () => {
  it('does not present sample content as live or verified', () => {
    const { container } = render(<FeedView />);
    const t = container.textContent || '';
    expect(t).not.toMatch(/verified|Live|live issues|Updated continuously/);
    expect(t).toContain(`${ISSUES.length} sample issues`);
  });
  it('feed cards show Sample data', () => {
    const { container } = render(<FeedView />);
    const cards = container.querySelectorAll('article.icard');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach(c => expect(c.textContent).toContain('Sample data'));
  });
});
