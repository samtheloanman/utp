import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShadowVote from '../ShadowVote';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('ShadowVote Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    render(<ShadowVote billId="test-bill" />);

    expect(await screen.findByText('Shadow Voting')).toBeDefined();
    expect(screen.getByText('For')).toBeDefined();
    expect(screen.getByText('Against')).toBeDefined();
    expect(screen.getByText('Unsure')).toBeDefined();
  });

  it('handles voting for', async () => {
    const user = { id: 'test-user' };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user } });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<ShadowVote billId="test-bill" />);

    // Wait for loading to finish
    const forButton = await screen.findByText('For');
    fireEvent.click(forButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/vote', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ billId: 'test-bill', vote: 'for' }),
      }));
    });
  });
});
