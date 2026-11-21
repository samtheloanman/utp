import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataStatusBadge } from './DataStatusBadge';

describe('DataStatusBadge', () => {
  it.each([
    ['live', 'Live'],
    ['stale', 'Stale'],
    ['unavailable', 'Unavailable'],
    ['not_integrated', 'Not integrated'],
    ['sample', 'Sample data'],
  ] as const)('renders %s as %s', (status, label) => {
    render(<DataStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('unavailable never renders item counts', () => {
    const { container } = render(<DataStatusBadge status="unavailable" fetchedAt={null} />);
    expect(container.textContent).toBe('Unavailable');
    expect(container.textContent).not.toMatch(/\d/);
  });

  it('shows fetchedAt for live data', () => {
    const { container } = render(<DataStatusBadge status="live" fetchedAt="2026-11-03T10:00:00Z" />);
    expect(container.textContent).toContain('2026-11-03T10:00:00Z');
  });
});
