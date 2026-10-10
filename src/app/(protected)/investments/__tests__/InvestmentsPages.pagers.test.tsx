import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/investments',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/client')>(
      '@/lib/api/client'
    );
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
      PUT: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    },
  };
});
vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);
// The mobile filter sheet, rendered in place so a pager inside it would show up.
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: ReactNode }) => (
    <div data-testid="mobile-bar">{children}</div>
  ),
}));
// The lists themselves are not under test here: one marker row stands in for them.
vi.mock('@/app/(protected)/investments/tradebook/TradebookMobileCards', () => ({
  TradebookMobileCards: () => null,
}));
vi.mock('@/app/(protected)/investments/tradebook/TradebookTable', () => ({
  TradebookTable: () => <div data-testid="list-row">trade row</div>,
}));
vi.mock('@/app/(protected)/investments/DividendsTable', () => ({
  DividendsTable: () => <div data-testid="list-row">dividend row</div>,
}));
vi.mock('@/app/(protected)/investments/CreateDividendDialog', () => ({
  CreateDividendDialog: () => null,
}));
vi.mock('@/app/(protected)/investments/DetectDividendsButton', () => ({
  DetectDividendsButton: () => null,
}));
vi.mock('@/app/(protected)/investments/fno/components/FnoMobileCards', () => ({
  FnoMobileCards: () => null,
}));
vi.mock('@/app/(protected)/investments/fno/components/FnoDesktopTable', () => ({
  FnoDesktopTable: () => <div data-testid="list-row">fno row</div>,
}));
vi.mock('@/app/(protected)/investments/fno/components/FnoSummaryCards', () => ({
  FnoSummaryCards: () => null,
}));
vi.mock('@/app/(protected)/investments/ImportWizardDialog', () => ({
  ImportWizardDialog: () => null,
}));
vi.mock('@/app/(protected)/investments/fno/CreateFnoTradeDialog', () => ({
  CreateFnoTradeDialog: () => null,
}));
const setCurrentPage = vi.fn();
const fno = { trades: 1 as number };
vi.mock('@/app/(protected)/investments/fno/components/useFnoView', () => ({
  useFnoView: () => ({
    search: '',
    setSearch: vi.fn(),
    contractTypeFilter: 'all',
    setContractTypeFilter: vi.fn(),
    optionTypeFilter: 'all',
    setOptionTypeFilter: vi.fn(),
    brokerFilter: 'all',
    setBrokerFilter: vi.fn(),
    pageSize: 10,
    setPageSize: vi.fn(),
    deletingTrade: null,
    setDeletingTrade: vi.fn(),
    isDeleting: false,
    sortedTrades: Array.from({ length: fno.trades * 35 }, (_, i) => ({
      id: `f${i}`,
    })),
    totalPages: Math.ceil((fno.trades * 35) / 10),
    pageClamped: 1,
    paginatedTrades: fno.trades ? [{ id: 'f0' }] : [],
    metrics: {},
    hasActiveFilters: false,
    clearFilters: vi.fn(),
    getBrokerName: () => 'Zerodha',
    toggleSort: vi.fn(),
    handleRefresh: vi.fn(),
    handleDeleteConfirm: vi.fn(),
    setCurrentPage,
  }),
}));

import { DividendsSection } from '@/app/(protected)/investments/DividendsSection';
import { FnoView } from '@/app/(protected)/investments/fno/FnoView';
import { TradebookSection } from '@/app/(protected)/investments/TradebookSection';
import { api } from '@/lib/api/client';
import type {
  DividendSummary,
  PagedDividendResponse,
  PagedInvestmentTransactionResponse,
} from '@/lib/types';
import { expectPagersAroundList } from '@/test/pagers';
import { renderWithQuery } from '@/test/renderWithQuery';

function paged<T>(content: T[], totalElements: number, size: number) {
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    size,
    number: 0,
    first: true,
    last: false,
    empty: !content.length,
  };
}
const bottomPager = () =>
  screen.getAllByRole('navigation', { name: 'Pagination' })[1];
const lastQueryTo = (path: string) =>
  (
    vi
      .mocked(api.GET)
      .mock.calls.filter((c) => c[0] === path)
      .at(-1)?.[1] as unknown as {
      params: { query: { page?: number } };
    }
  )?.params.query;

/** Answers `path` with `first`, echoing the requested page; other calls get no data. */
function serveList(path: string, first: ReturnType<typeof paged>) {
  vi.mocked(api.GET).mockImplementation((async (
    p: string,
    opts?: { params?: { query?: { page?: number } } }
  ) =>
    p === path
      ? { data: { ...first, number: opts?.params?.query?.page ?? 0 } }
      : { data: null }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  fno.trades = 1;
  vi.mocked(api.GET).mockResolvedValue({ data: null } as never);
});

describe('Tradebook pagers', () => {
  const initial = paged([{ id: 't1' }], 120, 12);

  it('shows the pager above and below the trades, outside the desktop and mobile filter bars', () => {
    renderWithQuery(
      <TradebookSection
        initialData={initial as unknown as PagedInvestmentTransactionResponse}
      />
    );
    expectPagersAroundList(
      screen.getByTestId('list-row'),
      screen.getAllByPlaceholderText('Search by symbol or name...')
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
    expect(screen.getAllByText('120 trades')).toHaveLength(2);
  });

  it('pages from the bottom pager', async () => {
    serveList('/api/v1/investments/transactions', initial);
    renderWithQuery(
      <TradebookSection
        initialData={initial as unknown as PagedInvestmentTransactionResponse}
      />
    );
    // The seeded page refetches on mount; the pager is disabled until that settles.
    await waitFor(() =>
      expect(
        within(bottomPager()).getByRole('button', { name: 'Page 3' })
      ).toBeEnabled()
    );
    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Page 3' })
    );
    await waitFor(() =>
      expect(lastQueryTo('/api/v1/investments/transactions')).toMatchObject({
        page: 2,
      })
    );
  });
});

describe('Dividends pagers', () => {
  const summary: DividendSummary = {
    buckets: [],
    totalAmount: 0,
    totalTds: 0,
    totalNet: 0,
    totalCount: 0,
  };
  const initial = paged([{ id: 'd1' }], 60, 25);

  it('shows the pager above and below the dividends, outside the desktop and mobile filter bars', () => {
    renderWithQuery(
      <DividendsSection
        initialData={initial as unknown as PagedDividendResponse}
        initialSummary={summary}
      />
    );
    expectPagersAroundList(
      screen.getByTestId('list-row'),
      screen.getAllByRole('combobox', { name: 'Receipt status' })
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
    expect(screen.getAllByText('60 dividends')).toHaveLength(2);
  });

  it('pages from the bottom pager', async () => {
    serveList('/api/v1/investments/dividends', initial);
    renderWithQuery(
      <DividendsSection
        initialData={initial as unknown as PagedDividendResponse}
        initialSummary={summary}
      />
    );
    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Next page' })
    );
    await waitFor(() =>
      expect(lastQueryTo('/api/v1/investments/dividends')).toMatchObject({
        page: 1,
      })
    );
  });
});

describe('F&O pagers', () => {
  it('shows the pager above and below the trades, outside the desktop and mobile filter bars', () => {
    renderWithQuery(<FnoView />);
    expectPagersAroundList(
      screen.getByTestId('list-row'),
      screen.getAllByPlaceholderText(/Search symbol/)
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
    expect(screen.getAllByText('35 trades')).toHaveLength(2);
  });

  it('pages from the bottom pager (1-based page state)', () => {
    renderWithQuery(<FnoView />);
    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Page 4' })
    );
    expect(setCurrentPage).toHaveBeenCalledWith(4);
  });

  it('shows no pager with the empty state', () => {
    fno.trades = 0;
    renderWithQuery(<FnoView />);
    expect(screen.getByText('No FnO trades recorded yet')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });
});
