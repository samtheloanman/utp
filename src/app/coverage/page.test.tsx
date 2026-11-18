import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LEGISTAR_JURISDICTIONS } from '@/lib/civic/legistar';
import CoveragePage from './page';

describe('coverage page', () => {
  it('lists every integrated local place with a link to its legislation', () => {
    const { getByText, container } = render(<CoveragePage />);
    const la = getByText('Los Angeles County') as HTMLAnchorElement;
    expect(la.getAttribute('href')).toBe('/legislature?local=lacounty');
    expect(container.querySelectorAll('a[href^="/legislature?local="]')).toHaveLength(LEGISTAR_JURISDICTIONS.length);
  });
  it('groups places by state and does not claim live data', () => {
    const { getByRole, container } = render(<CoveragePage />);
    expect(getByRole('heading', { name: /California/ })).toBeTruthy();
    expect(container.textContent).not.toMatch(/\blive\b/i);
  });
});
