import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CorporateActionReviewItem, CorporateActionReviewResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CorporateActionReview } from './CorporateActionReview';
import { demergerDetails, multiDetails, noticeSource } from './corporateActionScheme.fixtures';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router, usePathname: () => '/' }));
const actions = vi.hoisted(() => ({ load: vi.fn(), existing: vi.fn() }));
vi.mock('./corporateActionActions', () => ({
  loadCorporateActionSuggestion: actions.load,
  loadInstrumentCorporateActions: actions.existing,
  undoCorporateActionSuggestion: vi.fn(),
  dismissCorporateActionSuggestion: vi.fn(),
}));
const dialogProps = vi.hoisted(() => vi.fn());
vi.mock('./CorporateActionDialog', () => ({
  CorporateActionDialog: (p: unknown) => {
    dialogProps(p);
    return <div data-testid="dialog" />;
  },
}));
vi.mock('@/features/investments/lazyDialogs', async () => ({
  loadCorporateActionDialog: () => import('./CorporateActionDialog').then((m) => m.CorporateActionDialog),
}));

const demerger: CorporateActionReviewItem = {
  id: 's-1',
  kind: 'demerger',
  status: 'pending',
  reason: 'NEEDS_DETAILS',
  exDate: '2025-01-06',
  ratioFrom: null,
  ratioTo: null,
  subject: 'Demerger',
  instrument: { id: 'i-itc', name: 'ITC', symbol: 'ITC', exchange: 'NSE' },
  createdAt: '2025-01-07T00:00:00Z',
  source: 'NSE',
  sharesBefore: 12,
  possibleChildren: [],
};
const empty: CorporateActionReviewResponse = { needsReview: [], appliedAutomatically: [], notTrading: [] };

beforeEach(() => vi.clearAllMocks());

describe('CorporateActionReview: evidence', () => {
  it('shows the evidence lines with a notice link in a new tab', () => {
    renderWithQuery(<CorporateActionReview review={{ ...empty, needsReview: [{ ...demerger, details: demergerDetails() }] }} />);
    expect(screen.getByText('New company: ITC Hotels (ITCHOTELS), listed on NSE 29/01/25')).toBeInTheDocument();
    expect(screen.getByText('1 ITC Hotels share for every 10 ITC shares')).toBeInTheDocument();
    expect(screen.getByText('Cost split: ITC 86.49%, ITC Hotels 13.51%')).toBeInTheDocument();
    expect(screen.getByText('Groww: holdings file of 12/11/26 shows 12 ITC Hotels shares, as the ratio gives.')).toBeInTheDocument();
    const link = screen.getAllByRole('link', { name: 'View notice' })[0];
    expect(link).toHaveAttribute('href', noticeSource.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByText(/only says "Demerger"/)).toBeNull();
  });

  it('falls back to the note and possible companies without details', () => {
    const withCandidate = { ...demerger, details: undefined, possibleChildren: [{ symbol: 'ITCHOTELS', name: 'ITC Hotels', listedOn: '2025-01-29', yahooSymbol: 'ITCHOTELS.NS', isin: null, instrumentId: null }] };
    renderWithQuery(<CorporateActionReview review={{ ...empty, needsReview: [withCandidate] }} />);
    expect(screen.getByText(/only says "Demerger"/)).toBeInTheDocument();
    expect(screen.getByText('Possible new company: ITC Hotels (ITCHOTELS), listed on NSE 29/01/25')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View notice' })).toBeNull();
  });

  it('shows why an applied action was applied, with its evidence', () => {
    const applied = { ...demerger, status: 'auto_applied' as const, reason: null, details: demergerDetails(), appliedBecause: 'The notice and your holdings file agree.' };
    renderWithQuery(<CorporateActionReview review={{ ...empty, appliedAutomatically: [applied] }} />);
    expect(screen.getByText('The notice and your holdings file agree.')).toBeInTheDocument();
    expect(screen.getByText('1 ITC Hotels share for every 10 ITC shares')).toBeInTheDocument();
  });

  it('opens a suggestion with its details', async () => {
    const details = demergerDetails();
    actions.load.mockResolvedValue({ success: true, data: { ...demerger, details, instrument: { id: 'i-itc', name: 'ITC', symbol: 'ITC' }, possibleChildren: [] } });
    renderWithQuery(<CorporateActionReview review={{ ...empty, needsReview: [{ ...demerger, details }] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review and apply' }));
    await waitFor(() => expect(dialogProps).toHaveBeenCalled());
    expect(dialogProps.mock.calls[0][0]).toMatchObject({ type: 'demerger', suggestionId: 's-1', prefill: { details } });
  });

  it('opens a multi-child demerger at the first child not recorded yet', async () => {
    const details = multiDetails();
    actions.load.mockResolvedValue({ success: true, data: { ...demerger, details, instrument: { id: 'i-itc', name: 'ITC', symbol: 'ITC' }, possibleChildren: [] } });
    actions.existing.mockResolvedValue({ success: true, data: [{ type: 'demerger', exDate: '2025-01-06', targetInstrumentId: 'i-itch', targetInstrumentSymbol: 'ITCHOTELS' }] });
    renderWithQuery(<CorporateActionReview review={{ ...empty, needsReview: [{ ...demerger, details }] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review and apply' }));
    await waitFor(() => expect(dialogProps).toHaveBeenCalled());
    expect(actions.existing).toHaveBeenCalledWith('i-itc');
    expect(dialogProps.mock.calls[0][0]).toMatchObject({ prefill: { childIndex: 1 } });
  });

  it('shows what a not-trading stock merged into and opens the merger with it', async () => {
    const details = demergerDetails();
    const stock = { instrument: { id: 'i-old', name: 'Old Co', symbol: 'OLD', exchange: 'NSE' }, sharesHeld: 5, lastPrice: null, lastPriceDate: null, markedAt: null, details };
    renderWithQuery(<CorporateActionReview review={{ ...empty, notTrading: [stock] }} />);
    expect(screen.getByText('Merging into: ITC Hotels (ITCHOTELS), listed on NSE 29/01/25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Merged' }));
    await waitFor(() => expect(dialogProps).toHaveBeenCalled());
    expect(dialogProps.mock.calls[0][0]).toMatchObject({ type: 'merger', instrument: { id: 'i-old' }, prefill: { details } });
  });

  it('opens a not-trading merger without a prefill when nothing was read', async () => {
    const stock = { instrument: { id: 'i-old', name: 'Old Co', symbol: 'OLD', exchange: 'NSE' }, sharesHeld: 5, lastPrice: null, lastPriceDate: null, markedAt: null, details: undefined };
    renderWithQuery(<CorporateActionReview review={{ ...empty, notTrading: [stock] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Merged' }));
    await waitFor(() => expect(dialogProps).toHaveBeenCalled());
    expect(dialogProps.mock.calls[0][0].prefill).toBeUndefined();
  });
});
