import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

const m = vi.hoisted(() => ({ push: vi.fn(), params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }), useSearchParams: () => m.params }));

import ProposePage from './page';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

describe('propose page', () => {
  beforeEach(() => {
    m.push.mockReset();
    m.params = new URLSearchParams();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('prefills from a bill link, submits, and lists the new proposal', async () => {
    m.params = new URLSearchParams({ title: 'Budget', sourceUrl: 'https://sfgov.legistar.com/x' });
    fetchMock
      .mockResolvedValueOnce(json(200, { proposals: [] }))
      .mockResolvedValueOnce(json(201, { success: true }))
      .mockResolvedValueOnce(json(200, { proposals: [{ id: 'p1', title: 'Budget', description: null, source_url: 'https://sfgov.legistar.com/x', category: null }] }));
    const { findByText, getByText, getByLabelText } = render(<ProposePage />);
    await findByText('No proposals yet.');
    expect((getByLabelText('Title') as HTMLInputElement).value).toBe('Budget');
    fireEvent.click(getByText('Submit proposal'));
    await findByText('Proposal submitted.');
    const post = fetchMock.mock.calls[1];
    expect(post[1].method).toBe('POST');
    expect(JSON.parse(post[1].body)).toEqual({ title: 'Budget', description: '', sourceUrl: 'https://sfgov.legistar.com/x' });
    expect(((await findByText('source')) as HTMLAnchorElement).href).toBe('https://sfgov.legistar.com/x');
  });

  it('sends the bill id from a bill link and links a listed proposal to its bill', async () => {
    const BILL = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';
    m.params = new URLSearchParams({ title: 'Budget', sourceUrl: 'https://sfgov.legistar.com/x', billId: BILL });
    fetchMock
      .mockResolvedValueOnce(json(200, { proposals: [] }))
      .mockResolvedValueOnce(json(201, { success: true }))
      .mockResolvedValueOnce(json(200, { proposals: [{ id: 'p1', title: 'Budget', description: null, source_url: null, category: null, bill_id: BILL }] }));
    const { findByText, getByText } = render(<ProposePage />);
    await findByText('No proposals yet.');
    fireEvent.click(getByText('Submit proposal'));
    await findByText('Proposal submitted.');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).billId).toBe(BILL);
    expect(((await findByText('vote on the bill')) as HTMLAnchorElement).getAttribute('href')).toBe(`/bill/${BILL}`);
  });

  it('sends a signed-out user to sign in', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { proposals: [] })).mockResolvedValueOnce(json(401, { message: 'Unauthorized' }));
    const { findByText, getByText, getByLabelText } = render(<ProposePage />);
    await findByText('No proposals yet.');
    fireEvent.change(getByLabelText('Title'), { target: { value: 'Fix the park' } });
    fireEvent.click(getByText('Submit proposal'));
    await vi.waitFor(() => expect(m.push).toHaveBeenCalledWith('/login?redirect=/propose'));
  });

  it('shows the server reason when a proposal is rejected', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { proposals: [] })).mockResolvedValueOnce(json(409, { error: 'This article has already been proposed' }));
    const { findByText, getByText, getByLabelText, findByRole } = render(<ProposePage />);
    await findByText('No proposals yet.');
    fireEvent.change(getByLabelText('Title'), { target: { value: 'Budget' } });
    fireEvent.click(getByText('Submit proposal'));
    expect((await findByRole('alert')).textContent).toBe('This article has already been proposed');
  });
});
