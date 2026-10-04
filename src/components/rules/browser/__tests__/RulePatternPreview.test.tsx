import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RulePatternPreview } from '@/components/rules/browser/RulePatternPreview';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const txn1 = {
  id: 't1',
  date: '2026-09-12',
  amount: 450,
  type: 'DEBIT',
  sourcedDescription: 'UPI/SWIGGY/ORDER 123',
  categories: [{ id: 'c1', name: 'Food' }],
  reviewType: null,
  appliedRuleId: 'r1',
};
const txn2 = { ...txn1, id: 't2', sourcedDescription: 'SWIGGY INSTAMART', categories: [], appliedRuleId: null };

function paged(content: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 10,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

const post = api.POST as ReturnType<typeof vi.fn>;

function previewCalls() {
  return post.mock.calls.filter(([url]) => url === '/api/v1/rules/preview-matches');
}

const findButton = () => screen.getByRole('button', { name: /Find matching transactions/i });

describe('RulePatternPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({ data: paged([txn1, txn2]) });
  });

  it('is disabled while the pattern is empty or fails validation', () => {
    const { rerender } = renderWithQuery(<RulePatternPreview matchType="MERCHANT_KEY" merchantKey="  " />);
    expect(findButton()).toBeDisabled();

    rerender(<RulePatternPreview matchType="MERCHANT_KEY" merchantKey="ab1" />);
    expect(findButton()).toBeDisabled();

    rerender(<RulePatternPreview matchType="REGEX" merchantKey="SWIG(GY" />);
    expect(findButton()).toBeDisabled();

    rerender(<RulePatternPreview matchType="MERCHANT_KEY" merchantKey="SWIGGY" />);
    expect(findButton()).toBeEnabled();
  });

  it('fetches nothing until clicked, then previews the trimmed pattern and match type', async () => {
    renderWithQuery(<RulePatternPreview matchType="CONTAINS" merchantKey="  SWIGGY " />);
    expect(previewCalls()).toHaveLength(0);

    fireEvent.click(findButton());

    await waitFor(() => expect(screen.getByText('UPI/SWIGGY/ORDER 123')).toBeInTheDocument());
    expect(post).toHaveBeenCalledWith('/api/v1/rules/preview-matches', {
      params: { query: { page: 0, size: 10, sort: [] } },
      body: { merchantKey: 'SWIGGY', matchType: 'CONTAINS' },
    });
    expect(screen.getByText(/2 matching transactions/)).toBeInTheDocument();
    expect(screen.getByText('SWIGGY INSTAMART')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    post.mockResolvedValue({ data: paged([]) });
    renderWithQuery(<RulePatternPreview matchType="EXACT" merchantKey="NOPE" />);
    fireEvent.click(findButton());

    expect(await screen.findByText('No transactions match this pattern.')).toBeInTheDocument();
    expect(screen.getByText(/0 matching transactions/)).toBeInTheDocument();
  });

  it('flags a changed pattern without refetching, and refreshes on demand', async () => {
    const { rerender } = renderWithQuery(<RulePatternPreview matchType="CONTAINS" merchantKey="SWIGGY" />);
    fireEvent.click(findButton());
    await screen.findByText('UPI/SWIGGY/ORDER 123');

    rerender(<RulePatternPreview matchType="CONTAINS" merchantKey="SWIGGY INSTA" />);
    expect(screen.getByText('Pattern changed since this search')).toBeInTheDocument();
    expect(previewCalls()).toHaveLength(1);
    // Last results stay visible until refreshed.
    expect(screen.getByText('UPI/SWIGGY/ORDER 123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Refresh matches/i }));
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
    expect(previewCalls()[1][1].body).toEqual({ merchantKey: 'SWIGGY INSTA', matchType: 'CONTAINS' });
    await waitFor(() => expect(screen.queryByText('Pattern changed since this search')).not.toBeInTheDocument());
  });

  it('a match type change alone also marks the results stale', async () => {
    const { rerender } = renderWithQuery(<RulePatternPreview matchType="CONTAINS" merchantKey="SWIGGY" />);
    fireEvent.click(findButton());
    await screen.findByText('UPI/SWIGGY/ORDER 123');

    rerender(<RulePatternPreview matchType="STARTS_WITH" merchantKey="SWIGGY" />);
    expect(screen.getByText('Pattern changed since this search')).toBeInTheDocument();
  });

  it('marks transactions already linked to the rule being edited', async () => {
    renderWithQuery(<RulePatternPreview matchType="CONTAINS" merchantKey="SWIGGY" editingRuleId="r1" />);
    fireEvent.click(findButton());
    await screen.findByText('UPI/SWIGGY/ORDER 123');
    expect(screen.getAllByText('(already this rule)')).toHaveLength(1);
  });

  it('shows no "already this rule" marker when creating', async () => {
    renderWithQuery(<RulePatternPreview matchType="CONTAINS" merchantKey="SWIGGY" />);
    fireEvent.click(findButton());
    await screen.findByText('UPI/SWIGGY/ORDER 123');
    expect(screen.queryByText('(already this rule)')).not.toBeInTheDocument();
  });

  it('pages through matches server-side', async () => {
    post.mockResolvedValue({ data: paged([txn1, txn2], { totalElements: 25, totalPages: 3, last: false }) });
    renderWithQuery(<RulePatternPreview matchType="CONTAINS" merchantKey="SWIGGY" />);
    fireEvent.click(findButton());
    await screen.findByText('UPI/SWIGGY/ORDER 123');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/rules/preview-matches', {
        params: { query: { page: 1, size: 10, sort: [] } },
        body: { merchantKey: 'SWIGGY', matchType: 'CONTAINS' },
      })
    );
  });
});
