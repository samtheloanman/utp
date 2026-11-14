import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
const getSession = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/supabaseAuth/client', () => ({ createClient: () => ({ auth: { getSession } }) }));

import { VotePanel } from './VotePanel';
import { ISSUES, Issue } from '@/lib/data';

const UUID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const uuidIssue: Issue = { ...ISSUES[0], id: UUID, isSample: undefined };

describe('VotePanel', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    push.mockReset(); getSession.mockReset(); fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
    vi.spyOn(Storage.prototype, 'setItem');
  });

  it('uses the civic test vote copy', () => {
    render(<VotePanel issue={uuidIssue} />);
    expect(screen.getByText('Civic test vote · signed-in account')).toBeTruthy();
    expect(document.body.textContent).not.toContain('verified wallet');
  });

  it('redirects to login when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<VotePanel issue={uuidIssue} />);
    fireEvent.click(screen.getByText('For'));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/login?redirect=/issue/${UUID}`));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs /api/vote with bearer token and body', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    render(<VotePanel issue={uuidIssue} />);
    fireEvent.click(screen.getByText('Against'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/vote');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ billId: UUID, vote: 'against' });
    await waitFor(() => expect(screen.getByText(/counted as/)).toBeTruthy());
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('a 401 shows an error and does not select the vote', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) });
    render(<VotePanel issue={uuidIssue} />);
    fireEvent.click(screen.getByText('For'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/counted as/)).toBeNull();
    expect(document.querySelector('.vopt.sel')).toBeNull();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('sample issues never call /api/vote and show note and badge', async () => {
    const sample = ISSUES[0];
    expect(sample.isSample).toBe(true);
    render(<VotePanel issue={sample} />);
    expect(screen.getByText('Voting opens when this issue is linked to a sourced bill.')).toBeTruthy();
    expect(screen.getByText('Sample data')).toBeTruthy();
    const btns = document.querySelectorAll('.vopt');
    expect(btns.length).toBe(3);
    btns.forEach(b => { expect((b as HTMLButtonElement).disabled).toBe(true); fireEvent.click(b); });
    expect(getSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
