import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CorporateActionReviewItem, CorporateActionReviewResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CorporateActionReview } from './CorporateActionReview';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router, usePathname: () => '/' }));
const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
const actions = vi.hoisted(() => ({ load: vi.fn(), undo: vi.fn(), dismiss: vi.fn() }));
vi.mock('./corporateActionActions', () => ({
  loadCorporateActionSuggestion: actions.load,
  undoCorporateActionSuggestion: actions.undo,
  dismissCorporateActionSuggestion: actions.dismiss,
}));
vi.mock('./CorporateActionDialog', () => ({
  CorporateActionDialog: (p: { instrument?: { name: string }; type?: string; suggestionId?: string }) => (
    <div data-testid="dialog">{`${p.instrument?.name}|${p.type ?? ''}|${p.suggestionId ?? ''}`}</div>
  ),
}));
vi.mock('@/features/investments/lazyDialogs', async () => ({
  loadCorporateActionDialog: () => import('./CorporateActionDialog').then((m) => m.CorporateActionDialog),
}));

const item: CorporateActionReviewItem = {
  id: 's-1',
  kind: 'split',
  status: 'pending',
  reason: 'YAHOO_MISMATCH',
  exDate: '2025-06-10',
  ratioFrom: 1,
  ratioTo: 5,
  subject: 'Face value split from Rs 10 to Rs 2',
  instrument: { id: 'i-1', name: 'Acme Ltd', symbol: 'ACME', exchange: 'NSE' },
  createdAt: '2025-06-11T06:00:00Z',
  source: 'NSE',
  feedFactor: 2,
  sharesBefore: 10,
  sharesAfter: 50,
  avgCostBefore: 500,
  avgCostAfter: 100,
};
const review: CorporateActionReviewResponse = {
  needsReview: [item, { ...item, id: 's-2', kind: 'oversold', reason: null, soldQty: 3, sellDate: '2025-03-04', sharesAfter: null, subject: null, instrument: { id: 'i-2', name: 'Beta Ltd', symbol: 'BETA', exchange: 'NSE' } }],
  appliedAutomatically: [{ ...item, id: 's-3', status: 'auto_applied', reason: null, kind: 'bonus', ratioTo: 2, instrument: { id: 'i-3', name: 'Gamma Ltd', symbol: 'GAM', exchange: 'NSE' } }],
  notTrading: [{ instrument: { id: 'i-4', name: 'Delta Ltd', symbol: 'DEL', exchange: 'NSE' }, sharesHeld: 7, lastPrice: 12, lastPriceDate: '2025-05-02', markedAt: '2025-06-01T00:00:00Z' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.undo.mockResolvedValue({ success: true, data: undefined });
  actions.dismiss.mockResolvedValue({ success: true, data: undefined });
  actions.load.mockResolvedValue({ success: true, data: { ...item, instrument: { id: 'i-1', name: 'Acme Ltd', symbol: 'ACME' } } });
});

describe('CorporateActionReview', () => {
  it('renders nothing when there is nothing', () => {
    const { container } = renderWithQuery(<CorporateActionReview review={{ needsReview: [], appliedAutomatically: [], notTrading: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows both sections with counts and the full picture', () => {
    renderWithQuery(<CorporateActionReview review={review} />);
    expect(screen.getByText('Needs your review (3)')).toBeInTheDocument();
    expect(screen.getByText('Applied automatically (1)')).toBeInTheDocument();
    expect(screen.getByText('Split 1→5 · Acme Ltd')).toBeInTheDocument();
    expect(screen.getAllByText('Face value split from Rs 10 to Rs 2')[0]).toBeInTheDocument();
    expect(screen.getByText('The price feed shows a different ratio.')).toBeInTheDocument();
    expect(screen.getByText('You sold 3 more shares than you held, on 04/03/25')).toBeInTheDocument();
    expect(screen.getByText('Delta Ltd no longer trades')).toBeInTheDocument();
    expect(screen.getByText('Bonus 1:1 · Gamma Ltd')).toBeInTheDocument();
    expect(screen.getByText('Applied on 11/06/25')).toBeInTheDocument();
  });

  it('only the applied section when nothing needs review', () => {
    renderWithQuery(<CorporateActionReview review={{ ...review, needsReview: [], notTrading: [] }} />);
    expect(screen.queryByText(/Needs your review/)).toBeNull();
    expect(screen.getByText('Applied automatically (1)')).toBeInTheDocument();
  });

  it('Review and apply opens the dialog prefilled with the suggestion', async () => {
    renderWithQuery(<CorporateActionReview review={review} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review and apply' }));
    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveTextContent('Acme Ltd|split|s-1'));
    expect(actions.load).toHaveBeenCalledWith('s-1');
  });

  it('Not applicable dismisses, refreshes and toasts', async () => {
    renderWithQuery(<CorporateActionReview review={{ ...review, needsReview: [item] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not applicable' }));
    await waitFor(() => expect(actions.dismiss).toHaveBeenCalledWith('s-1'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Dismissed');
  });

  it('Undo takes the applied action back', async () => {
    renderWithQuery(<CorporateActionReview review={review} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(actions.undo).toHaveBeenCalledWith('s-3'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Removed'));
  });

  it('a failed action shows a danger toast and does not refresh', async () => {
    actions.undo.mockResolvedValue({ success: false, error: 'nope' });
    renderWithQuery(<CorporateActionReview review={review} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('oversold records a corporate action for that instrument', async () => {
    renderWithQuery(<CorporateActionReview review={review} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record a corporate action' }));
    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveTextContent('Beta Ltd||'));
  });

  it('Merged and Delisted open the dialog on that kind', async () => {
    renderWithQuery(<CorporateActionReview review={review} />);
    fireEvent.click(screen.getByRole('button', { name: 'Merged' }));
    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveTextContent('Delta Ltd|merger|'));
  });

  it('Delisted opens the delisted form', async () => {
    renderWithQuery(<CorporateActionReview review={review} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delisted' }));
    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveTextContent('Delta Ltd|delisted|'));
  });
});
