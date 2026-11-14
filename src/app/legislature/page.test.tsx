import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const getLegislature = vi.fn();
vi.mock('@/lib/civic/legislature', () => ({ getLegislature: (...a: unknown[]) => getLegislature(...a) }));

import LegislaturePage from './page';

describe('legislature page', () => {
  it('renders the status badge and no counts when unavailable', async () => {
    getLegislature.mockResolvedValue({ status: 'unavailable', fetchedAt: null, source: { name: 'Congress.gov', url: 'u' }, items: [] });
    const { container, getByText } = render(await LegislaturePage());
    expect(getByText('Unavailable')).toBeTruthy();
    expect(container.textContent).not.toContain('Status:');
    expect(container.textContent).not.toMatch(/\d+ (bills|items)/);
  });
});
