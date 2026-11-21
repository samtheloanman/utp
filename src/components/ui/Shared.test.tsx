import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockBrowserClient = vi.fn();
vi.mock('@/lib/supabaseAuth/browser', () => ({
  createBrowserSupabaseClient: () => mockBrowserClient(),
}));

import { TopBar } from './Shared';

describe('TopBar canonical Supabase Auth controls', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    mockBrowserClient.mockReset();
  });

  it('renders Sign In without throwing when Supabase env is unconfigured and navigates to /login', () => {
    mockBrowserClient.mockReturnValue(null);
    render(<TopBar />);

    const signInButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(signInButton);
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('renders Sign Out when an active Supabase session exists and signs out cleanly', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const unsubscribe = vi.fn();
    mockBrowserClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
        signOut,
      },
    });

    const { unmount } = render(<TopBar />);

    const signOutButton = await screen.findByRole('button', { name: 'Sign Out' });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
