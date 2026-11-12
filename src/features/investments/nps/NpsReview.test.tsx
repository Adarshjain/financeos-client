import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => router }));

import { showToast } from '@/components/ds/Toast/Toast';
import { serverApi as api } from '@/lib/api/server';
import type { NpsReviewResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { NpsReview } from './NpsReview';

const account = { id: 'a1', pranLast4: '0000', holderName: 'Test Holder', relation: 'SELF' as const, tiers: ['I' as const] };
const pay = (id: string, description: string | null = 'NPS TRUST A/C') => ({ transactionId: id, date: '2026-01-05', amount: 5000, description, accountName: 'Test Bank ••1111' });
const contribution = { id: 'c1', account, tier: 'I' as const, date: '2026-01-05', amount: 5000, source: 'STATEMENT' as const, statementPeriodStart: '2026-01-01', statementPeriodEnd: '2026-03-31' };

const empty: NpsReviewResponse = { matches: [], unrecorded: [], setup: undefined };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
});

describe('NpsReview', () => {
  it('renders nothing when there is nothing to review', () => {
    const { container } = renderWithQuery(<NpsReview review={empty} />);
    expect(container).toBeEmptyDOMElement();
    renderWithQuery(<NpsReview review={null} />);
    expect(screen.queryByText('Needs your review')).toBeNull();
  });

  it('shows the contribution, why, and each candidate in full; This one links it', async () => {
    renderWithQuery(<NpsReview review={{ ...empty, matches: [{ contribution, candidates: [pay('t1'), pay('t2', 'Other long description')], why: 'MULTIPLE_CANDIDATES' }] }} />);
    expect(screen.getByText('Needs your review')).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(screen.getByText('Which payment is this contribution?')).toBeInTheDocument();
    expect(screen.getByText('PRAN ••0000 · Test Holder')).toBeInTheDocument();
    expect(screen.getByText('NPS statement, 01/01/26–31/03/26')).toBeInTheDocument();
    expect(screen.getByText('More than one bank payment fits this contribution.')).toBeInTheDocument();
    expect(screen.getByText('Other long description')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'This one' })[1]);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/entries/{id}/transaction', { params: { path: { id: 'c1' } }, body: { transactionId: 't2' } }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Linked to the NPS contribution');
  });

  it('None of these dismisses every candidate pair', async () => {
    renderWithQuery(<NpsReview review={{ ...empty, matches: [{ contribution, candidates: [pay('t1'), pay('t2')], why: 'SHARED_PAYMENT' }] }} />);
    expect(screen.getByText('This payment also fits another contribution.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'None of these' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/entries/{id}/suggestion/dismiss', { params: { path: { id: 'c1' } }, body: { transactionId: 't1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/entries/{id}/suggestion/dismiss', { params: { path: { id: 'c1' } }, body: { transactionId: 't2' } });
  });

  it('an unrecorded payment shows the evidence; Record sends the only account and tier, Not NPS marks it', async () => {
    renderWithQuery(<NpsReview review={{ ...empty, unrecorded: [{ payment: pay('t9'), matchedOn: 'NPS', daysSince: 12, recordTo: [account] }] }} />);
    expect(screen.getByText('Record this payment as NPS?')).toBeInTheDocument();
    expect(screen.getByText('Looks like NPS because the description has “NPS”')).toBeInTheDocument();
    expect(screen.getByText('12 days ago, and no NPS statement has it yet')).toBeInTheDocument();
    expect(screen.queryByText('Record to')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/transactions/{txnId}/record', { params: { path: { txnId: 't9' } }, body: { accountId: 'a1', tier: 'I' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Not NPS' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/transactions/{txnId}/not-nps', { params: { path: { txnId: 't9' } } }));
  });

  it('leaves the keyword line out when there is none, and offers a choice when there are several targets', () => {
    renderWithQuery(<NpsReview review={{ ...empty, unrecorded: [{ payment: pay('t9'), matchedOn: null, daysSince: 3, recordTo: [account, { ...account, id: 'a2', pranLast4: '1111', tiers: ['I', 'II'] }] }] }} />);
    expect(screen.queryByText(/Looks like NPS because/)).toBeNull();
    expect(screen.getByText('Record to')).toBeInTheDocument();
  });

  it('the setup offer lists the sample, links to the upload and Not NPS stops it', async () => {
    renderWithQuery(<NpsReview review={{ ...empty, setup: { paymentCount: 6, totalAmount: 120000, firstDate: '2026-01-05', lastDate: '2026-06-05', sample: [pay('t1', 'Monthly NPS')] } }} />);
    expect(screen.getByText('Looks like you invest in NPS')).toBeInTheDocument();
    expect(screen.getByText('6 payments, ₹1,20,000 from 05/01/26 to 05/06/26')).toBeInTheDocument();
    expect(screen.getByText('Monthly NPS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up NPS' })).toHaveAttribute('href', expect.stringContaining('type='));
    fireEvent.click(screen.getByRole('button', { name: 'Not NPS' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/setup/not-nps'));
  });

  it('a failed action shows an error toast and does not refresh', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    renderWithQuery(<NpsReview review={{ ...empty, unrecorded: [{ payment: pay('t9'), matchedOn: null, daysSince: 3, recordTo: [account] }] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not NPS' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
