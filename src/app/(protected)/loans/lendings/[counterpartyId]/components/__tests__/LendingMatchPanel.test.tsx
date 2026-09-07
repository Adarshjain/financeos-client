import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LendingMatchPanel } from '../LendingMatchPanel';

type TransactionResponse = Schemas['TransactionResponse'];
type LendingMatchSuggestion = Schemas['LendingMatchSuggestion'];

const mockAccounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

function makeCandidate(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id: 'tx-1',
    accountId: 'acc1',
    amount: -500,
    categories: [],
    createdAt: '2026-01-01T00:00:00Z',
    date: '2026-01-01',
    description: 'Coffee Shop',
    isTransactionExcluded: false,
    isTransactionUnderMonitoring: false,
    links: [],
    obligationRefs: [],
    reviewReasons: [],
    source: 'manual',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSuggestion(overrides: Partial<LendingMatchSuggestion> = {}): LendingMatchSuggestion {
  return {
    amount: 500,
    candidates: [makeCandidate()],
    direction: 'lent',
    entryDate: '2026-02-10',
    lendingId: 'l1',
    ...overrides,
  };
}

/** Routes the shared api.GET mock by path — the panel loads accounts
 *  (for CandidateSummary's account label) AND the match-suggestions endpoint,
 *  and a single blanket `mockResolvedValue` would answer both calls with the
 *  same payload. */
function mockGetRoutes(suggestions: LendingMatchSuggestion[]) {
  vi.mocked(api.GET).mockImplementation((path: unknown) => {
    if (path === '/api/v1/accounts') {
      return Promise.resolve({ data: mockAccounts } as never);
    }
    if (path === '/api/v1/counterparties/{id}/match-suggestions') {
      return Promise.resolve({ data: { suggestions } } as never);
    }
    return Promise.resolve({ data: null } as never);
  });
}

function renderPanel() {
  return renderWithQuery(<LendingMatchPanel counterpartyId="cp1" />);
}

function clickFindMatches() {
  fireEvent.click(screen.getByRole('button', { name: /Find Matches/i }));
}

describe('LendingMatchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRoutes([]);
  });

  it('shows the hint and the Find Matches button before any fetch', () => {
    renderPanel();

    expect(
      screen.getByText(/Click.*Find Matches.*to look for bank transactions/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Matches/i })).toBeInTheDocument();
  });

  it('shows the empty text after a fetch returns no suggestions', async () => {
    mockGetRoutes([]);
    renderPanel();

    clickFindMatches();

    await waitFor(() => {
      expect(
        screen.getByText('No matching transactions found for the unlinked entries.'),
      ).toBeInTheDocument();
    });
  });

  it('renders the direction badge, amount, and date for each suggestion row', async () => {
    mockGetRoutes([makeSuggestion()]);
    renderPanel();

    clickFindMatches();

    await waitFor(() => {
      expect(screen.getByText('I Lent')).toBeInTheDocument();
    });
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
  });

  it('renders an inline candidate summary when there is exactly one candidate', async () => {
    mockGetRoutes([makeSuggestion({ candidates: [makeCandidate({ description: 'Coffee Shop' })] })]);
    renderPanel();

    clickFindMatches();

    await waitFor(() => {
      expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders a Select when a suggestion has multiple candidates', async () => {
    mockGetRoutes([
      makeSuggestion({
        candidates: [
          makeCandidate({ id: 'c1', description: 'Candidate One' }),
          makeCandidate({ id: 'c2', description: 'Candidate Two' }),
        ],
      }),
    ]);
    renderPanel();

    clickFindMatches();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('shows Confirm per row and Confirm All when at least one suggestion is present', async () => {
    mockGetRoutes([makeSuggestion()]);
    renderPanel();

    clickFindMatches();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Confirm All/i })).toBeInTheDocument();
  });

  it('disables Confirm All while a single-row confirm is in flight, then re-enables it', async () => {
    mockGetRoutes([makeSuggestion({ lendingId: 'l1' }), makeSuggestion({ lendingId: 'l2' })]);
    let resolvePut: (v: unknown) => void = () => {};
    vi.mocked(api.PUT).mockReturnValue(
      new Promise((resolve) => {
        resolvePut = resolve;
      }) as never,
    );
    renderPanel();

    clickFindMatches();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Confirm' })).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Confirm' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm All/i })).toBeDisabled();
    });

    resolvePut({ data: { id: 'l1' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm All/i })).not.toBeDisabled();
    });
  });
});
