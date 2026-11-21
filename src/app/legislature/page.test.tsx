import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const getLegislature = vi.fn();
const getLocalLegislature = vi.fn();
vi.mock('@/lib/civic/legislature', () => ({
  getLegislature: (...a: unknown[]) => getLegislature(...a),
  getLocalLegislature: (...a: unknown[]) => getLocalLegislature(...a),
}));

import LegislaturePage from './page';

describe('legislature page', () => {
  it('renders the status badge and no counts when unavailable', async () => {
    getLegislature.mockResolvedValue({ status: 'unavailable', fetchedAt: null, source: { name: 'Congress.gov', url: 'u' }, items: [] });
    const { container, getByText } = render(await LegislaturePage({}));
    expect(getByText('Unavailable')).toBeTruthy();
    expect(container.textContent).not.toContain('Status:');
    expect(container.textContent).not.toMatch(/\d+ (bills|items)/);
  });

  it('shows a local place with its name and source-linked items', async () => {
    getLocalLegislature.mockResolvedValue({
      status: 'live', fetchedAt: '2026-11-17T12:00:00.000Z', source: { name: 'Legistar (San Francisco)', url: 'u' },
      jurisdiction: { client: 'sfgov', name: 'San Francisco', ocdId: 'ocd-division/country:us/state:ca/place:san_francisco' },
      items: [{ externalId: 'legistar-sfgov-1', number: '251', title: 'Budget', status: 'Passed', sourceUrl: 'https://sfgov.legistar.com/x' }],
    });
    const { getByText, getByRole } = render(await LegislaturePage({ searchParams: Promise.resolve({ local: 'sfgov' }) }));
    expect(getLocalLegislature).toHaveBeenCalledWith('sfgov');
    expect(getByRole('heading', { level: 1 }).textContent).toContain('San Francisco');
    expect((getByText('251') as HTMLAnchorElement).href).toBe('https://sfgov.legistar.com/x');
  });
});
