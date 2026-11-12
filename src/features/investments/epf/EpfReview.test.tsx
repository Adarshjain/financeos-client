import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: http }));
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => router }));

import { showToast } from '@/components/ds/Toast/Toast';
import type { EpfReviewMatch } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { EpfReview } from './EpfReview';

const match = (over: Partial<EpfReviewMatch> = {}): EpfReviewMatch => ({
  entry: { id: 'e1', creditedOn: '2026-02-10', kind: 'PARTIAL', description: null, employerName: 'Test Employer', gross: 100000, received: 90000, tdsAmount: 10000 },
  credit: { transactionId: 't1', date: '2026-02-12', amount: 90000, description: 'EPFO CLAIM SETTLEMENT', accountName: 'Test Bank ••1111' },
  difference: 0,
  daysApart: 2,
  why: 'NEEDS_CONFIRMATION',
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  http.PUT.mockResolvedValue({ data: {} });
  http.POST.mockResolvedValue({ data: undefined });
});

describe('EpfReview', () => {
  it('renders nothing without matches', () => {
    renderWithQuery(<EpfReview review={{ matches: [] }} />);
    renderWithQuery(<EpfReview review={null} />);
    expect(screen.queryByText('Needs your review')).toBeNull();
  });

  it('shows both sides, the comparison and why', () => {
    renderWithQuery(<EpfReview review={{ matches: [match()] }} />);
    expect(screen.getByText('Is this bank credit your EPF withdrawal?')).toBeInTheDocument();
    expect(screen.getByText('Test Employer')).toBeInTheDocument();
    expect(screen.getByText('Partial withdrawal')).toBeInTheDocument();
    expect(screen.getByText('EPFO CLAIM SETTLEMENT')).toBeInTheDocument();
    expect(screen.getByText('Amounts match · 2 days apart')).toBeInTheDocument();
    expect(screen.getByText('We always ask before linking EPF money.')).toBeInTheDocument();
  });

  it('shows the difference and the other reasons', () => {
    renderWithQuery(<EpfReview review={{ matches: [match({ difference: 500, why: 'MULTIPLE_CREDITS' }), match({ why: 'SHARED_CREDIT', entry: { ...match().entry, id: 'e2', tdsAmount: null } })] }} />);
    expect(screen.getByText('Differs by ₹500 · 2 days apart')).toBeInTheDocument();
    expect(screen.getByText('More than one bank credit fits this withdrawal.')).toBeInTheDocument();
    expect(screen.getByText('This credit also fits another withdrawal.')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('Link links the credit without recording TDS, then refreshes', async () => {
    renderWithQuery(<EpfReview review={{ matches: [match()] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: 'e1' } }, body: { transactionId: 't1', recordTds: false } }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Linked to the EPF withdrawal');
  });

  it('Not this one dismisses the suggestion', async () => {
    renderWithQuery(<EpfReview review={{ matches: [match()] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not this one' }));
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/suggestion/dismiss', { params: { path: { id: 'e1' } }, body: { transactionId: 't1' } }));
    expect(showToast).toHaveBeenCalledWith('Dismissed');
  });

  it('a failed link shows an error toast and does not refresh', async () => {
    http.PUT.mockRejectedValue(new Error('boom'));
    renderWithQuery(<EpfReview review={{ matches: [match()] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('a review that failed to load shows the load error in its place', () => {
    renderWithQuery(<EpfReview review={null} />);
    expect(screen.getByText(/Couldn't load the EPF review/)).toBeInTheDocument();
  });
});
