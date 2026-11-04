import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'natl-insulin' }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ login: vi.fn(), logout: vi.fn(), authenticated: false }) }));
vi.mock('@/lib/supabaseAuth/client', () => ({ createClient: () => ({ auth: { getSession: vi.fn() } }) }));

import DetailView from './page';

describe('issue page', () => {
  it('labels a synthetic issue as Sample data', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<DetailView />);
    expect(screen.getAllByText('Sample data').length).toBeGreaterThan(0);
  });
});
