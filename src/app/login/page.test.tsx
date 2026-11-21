import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/lib/supabaseAuth/client', () => ({
  createClient: () => ({
    auth: { signInWithOAuth: mocks.signInWithOAuth },
  }),
}));

import LoginPage from './page';

describe('login page', () => {
  beforeEach(() => {
    mocks.signInWithOAuth.mockReset();
    mocks.searchParams = new URLSearchParams();
  });

  it('offers Google sign-in and hides GitHub for Google-only Alpha', () => {
    const { getByRole, queryByRole } = render(<LoginPage />);
    expect(getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(queryByRole('button', { name: /github/i })).toBeNull();
  });

  it('starts Google OAuth with the requested safe redirect path', async () => {
    mocks.searchParams = new URLSearchParams('redirect=/account');
    mocks.signInWithOAuth.mockResolvedValue({ error: null });

    const { getByRole } = render(<LoginPage />);
    fireEvent.click(getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?redirect=%2Faccount` },
      });
    });
  });

  it('shows provider errors and re-enables the button', async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: { message: 'Provider disabled' } });

    const { getByRole, findByRole } = render(<LoginPage />);
    const button = getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement;
    fireEvent.click(button);

    expect((await findByRole('alert')).textContent).toBe('Provider disabled');
    expect(button.disabled).toBe(false);
  });
});
