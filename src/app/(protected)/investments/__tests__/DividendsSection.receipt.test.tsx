import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  search: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => nav.router,
  usePathname: () => '/investments/dividends',
  useSearchParams: () => nav.search,
}));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: React.ReactNode }) => <div data-testid="mobile-bar">{children}</div>,
}));
vi.mock('@/components/reports/views/TablePagination', () => ({
  TablePagination: ({ onPageChange }: { onPageChange: (p: number) => void }) => (
    <button onClick={() => onPageChange(2)}>go-page-2</button>
  ),
}));
vi.mock('@/app/(protected)/investments/DividendsTable', () => ({
  DividendsTable: ({ dividends }: { dividends: unknown[] }) => <div data-testid="table">rows:{dividends.length}</div>,
}));
vi.mock('@/app/(protected)/investments/dividend-receipts/DividendReconcilePanel', () => ({
  DividendReconcilePanel: ({ brokerAccountId }: { brokerAccountId?: string }) => (
    <div data-testid="reconcile">reconcile:{brokerAccountId ?? 'all'}</div>
  ),
}));
vi.mock('@/app/(protected)/investments/CreateDividendDialog', () => ({ CreateDividendDialog: () => null }));
vi.mock('@/app/(protected)/investments/DetectDividendsButton', () => ({ DetectDividendsButton: () => null }));

import { DividendsSection } from '@/app/(protected)/investments/DividendsSection';
import { api } from '@/lib/api/client';
import { AccountType, DividendReceiptSummary, DividendSummary, PagedDividendResponse } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { renderWithQuery } from '@/test/renderWithQuery';

import { makeDividend } from '../dividend-receipts/__tests__/fixtures';

const LIST = '/api/v1/investments/dividends';
const SUMMARY = '/api/v1/investments/dividends/summary';
const RECEIPTS = '/api/v1/investments/dividends/receipts/summary';

const page = (content = [makeDividend()]): PagedDividendResponse =>
  ({ content, totalElements: content.length, number: 0, size: 25, totalPages: 1, first: true, last: true, empty: !content.length }) as PagedDividendResponse;
const fySummary: DividendSummary = { buckets: [], totalAmount: 0, totalTds: 0, totalNet: 0, totalCount: 0 };

const bucket = (status: string, count: number, expectedNet: number, receivedAmount: number) => ({
  status,
  count,
  expectedNet,
  receivedAmount,
});
const receiptSummary = (coverageEnd: string | null = '2026-03-31'): DividendReceiptSummary => ({
  buckets: [
    bucket('received', 3, 2700, 2650),
    bucket('awaiting', 2, 500, 0),
    bucket('overdue', 1, 900, 0),
    bucket('unverifiable', 4, 1200, 0),
    bucket('received_untracked', 0, 0, 0),
    bucket('not_received', 0, 0, 0),
  ] as DividendReceiptSummary['buckets'],
  coverageEnd,
  totalCount: 10,
});

let receiptsPayload: DividendReceiptSummary = receiptSummary();

function route() {
  vi.mocked(api.GET).mockImplementation((path: unknown) => {
    if (path === LIST) return Promise.resolve({ data: page() } as never);
    if (path === SUMMARY) return Promise.resolve({ data: fySummary } as never);
    if (path === RECEIPTS) return Promise.resolve({ data: receiptsPayload } as never);
    if (path === '/api/v1/accounts')
      return Promise.resolve({ data: [{ id: 'broker-1', name: 'Zerodha', type: AccountType.BROKER }] } as never);
    if (path === '/api/v1/investments/positions') return Promise.resolve({ data: { positions: [] } } as never);
    return Promise.resolve({ data: null } as never);
  });
}

function renderSection(initialReceiptSummary: DividendReceiptSummary | undefined = receiptSummary()) {
  return renderWithQuery(
    <DividendsSection initialData={page()} initialSummary={fySummary} initialReceiptSummary={initialReceiptSummary} />,
  );
}

const callsTo = (path: string) =>
  vi.mocked(api.GET).mock.calls.filter((c) => c[0] === path).map((c) => (c[1] as { params: { query: Record<string, unknown> } }).params.query);

const receiptSelects = () =>
  screen.getAllByRole('combobox', { name: 'Receipt status' }).map((c) => c.closest('[data-testid="select"]') as HTMLElement);

describe('DividendsSection receipt features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = new URLSearchParams();
    receiptsPayload = receiptSummary();
    route();
  });

  describe('receipt summary card', () => {
    it('shows the tiles with counts and amounts (received=receivedAmount, others=expectedNet)', () => {
      renderSection();
      const card = screen.getByTestId('receipt-summary');
      expect(within(card).getByText('Received').nextElementSibling).toHaveTextContent('3 · ₹2,650.00');
      expect(within(card).getByText('Awaiting').nextElementSibling).toHaveTextContent('2 · ₹500.00');
      expect(within(card).getByText('Overdue').nextElementSibling).toHaveTextContent('1 · ₹900.00');
      const unverifiable = within(card).getByText('No bank data').nextElementSibling;
      expect(unverifiable).toHaveTextContent(/^4$/);
    });

    it('shows the coverage caption, or the "no bank transactions" caption when coverage is null', () => {
      const a = renderSection(receiptSummary('2026-03-31'));
      expect(screen.getByText(`Bank data through ${formatDate('2026-03-31')}`)).toBeInTheDocument();
      a.unmount();
      receiptsPayload = receiptSummary(null);
      renderSection(receiptSummary(null));
      expect(screen.getByText('No bank transactions imported yet')).toBeInTheDocument();
    });

    it('renders zeros when the summary has no buckets', () => {
      receiptsPayload = { buckets: [], coverageEnd: null, totalCount: 0 };
      renderSection({ buckets: [], coverageEnd: null, totalCount: 0 });
      expect(within(screen.getByTestId('receipt-summary')).getByText('Awaiting').nextElementSibling).toHaveTextContent('0 · ₹0.00');
    });

    it('refetches the receipt summary with the broker filter applied', async () => {
      renderSection();
      fireEvent.click((await screen.findAllByRole('option', { name: 'Zerodha' }))[0]);
      await waitFor(() => expect(callsTo(RECEIPTS)).toContainEqual({ brokerAccountId: 'broker-1' }));
    });
  });

  describe('receipt filter', () => {
    it('appears in both the desktop bar and the mobile action bar with all options', () => {
      renderSection();
      expect(receiptSelects()).toHaveLength(2);
      expect(within(screen.getByTestId('mobile-bar')).getByRole('combobox', { name: 'Receipt status' })).toBeInTheDocument();
      const [first] = receiptSelects();
      for (const label of ['All receipts', 'Received', 'Awaiting', 'Overdue', 'No bank data', 'Received (untracked)', 'Not received']) {
        expect(within(first).getByRole('option', { name: label })).toBeInTheDocument();
      }
    });

    it('sends `receipt` in the list query and omits it for All', async () => {
      renderSection();
      fireEvent.click(within(receiptSelects()[0]).getByRole('option', { name: 'Overdue' }));
      await waitFor(() => expect(callsTo(LIST)).toContainEqual(expect.objectContaining({ receipt: 'overdue', page: 0 })));
      expect(callsTo(LIST).some((q) => 'receipt' in q && q.receipt === undefined)).toBe(false);

      vi.mocked(api.GET).mockClear();
      fireEvent.click(within(receiptSelects()[0]).getByRole('option', { name: 'All receipts' }));
      await waitFor(() => expect(callsTo(LIST).length).toBeGreaterThan(0));
      expect(callsTo(LIST).every((q) => !('receipt' in q))).toBe(true);
    });

    it('maps each option to its server status value', async () => {
      renderSection();
      const expected: [string, string][] = [
        ['Received', 'received'],
        ['Awaiting', 'awaiting'],
        ['No bank data', 'unverifiable'],
        ['Received (untracked)', 'received_untracked'],
        ['Not received', 'not_received'],
      ];
      for (const [label, value] of expected) {
        fireEvent.click(within(receiptSelects()[0]).getByRole('option', { name: label }));
        await waitFor(() => expect(callsTo(LIST)).toContainEqual(expect.objectContaining({ receipt: value })));
      }
    });

    it('resets to page 0 when the receipt filter changes', async () => {
      renderSection();
      fireEvent.click(screen.getAllByText('go-page-2')[0]);
      await waitFor(() => expect(callsTo(LIST)).toContainEqual(expect.objectContaining({ page: 2 })));

      fireEvent.click(within(receiptSelects()[0]).getByRole('option', { name: 'Awaiting' }));
      await waitFor(() =>
        expect(callsTo(LIST)).toContainEqual(expect.objectContaining({ receipt: 'awaiting', page: 0 })),
      );
    });

    it('does not filter the receipt summary by the receipt filter (it is the breakdown)', async () => {
      renderSection();
      fireEvent.click(within(receiptSelects()[0]).getByRole('option', { name: 'Overdue' }));
      await waitFor(() => expect(callsTo(LIST)).toContainEqual(expect.objectContaining({ receipt: 'overdue' })));
      expect(callsTo(RECEIPTS).every((q) => !('receipt' in q))).toBe(true);
    });
  });

  describe('instrument deep link', () => {
    it('without ?instrumentId: no chip and no instrumentId in queries', async () => {
      renderSection();
      expect(screen.queryByRole('button', { name: 'Clear instrument filter' })).not.toBeInTheDocument();
      await waitFor(() => expect(callsTo(LIST).length).toBeGreaterThan(0));
      expect([...callsTo(LIST), ...callsTo(SUMMARY), ...callsTo(RECEIPTS)].every((q) => !('instrumentId' in q))).toBe(true);
    });

    it('with ?instrumentId: passes it to list, FY summary and receipt summary, and shows the chip with the symbol', async () => {
      nav.search = new URLSearchParams('instrumentId=inst-1');
      renderSection();
      expect(screen.getByRole('button', { name: 'Clear instrument filter' })).toHaveTextContent('Showing INFY');
      await waitFor(() => {
        expect(callsTo(LIST)).toContainEqual(expect.objectContaining({ instrumentId: 'inst-1' }));
        expect(callsTo(SUMMARY)).toContainEqual(expect.objectContaining({ instrumentId: 'inst-1' }));
        expect(callsTo(RECEIPTS)).toContainEqual(expect.objectContaining({ instrumentId: 'inst-1' }));
      });
    });

    it('falls back to the instrument name, then to a generic label when rows are unknown', () => {
      nav.search = new URLSearchParams('instrumentId=inst-1');
      const named = renderWithQuery(
        <DividendsSection
          initialData={page([makeDividend({ symbol: undefined })])}
          initialSummary={fySummary}
          initialReceiptSummary={receiptSummary()}
        />,
      );
      expect(screen.getByRole('button', { name: 'Clear instrument filter' })).toHaveTextContent('Showing Infosys Limited');
      named.unmount();
      vi.mocked(api.GET).mockResolvedValue({ data: page([]) } as never);
      renderWithQuery(
        <DividendsSection initialData={page([])} initialSummary={fySummary} initialReceiptSummary={receiptSummary()} />,
      );
      expect(screen.getByRole('button', { name: 'Clear instrument filter' })).toHaveTextContent('Showing one instrument');
    });

    it('clearing the chip replaces the URL with the bare dividends route', () => {
      nav.search = new URLSearchParams('instrumentId=inst-1');
      renderSection();
      fireEvent.click(screen.getByRole('button', { name: 'Clear instrument filter' }));
      expect(nav.router.replace).toHaveBeenCalledWith('/investments/dividends');
    });
  });

  describe('Reconcile toggle', () => {
    it('is hidden by default, toggles on/off, and passes the broker filter', async () => {
      renderSection();
      expect(screen.queryByTestId('reconcile')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Reconcile/ }));
      expect(screen.getByTestId('reconcile')).toHaveTextContent('reconcile:all');

      fireEvent.click((await screen.findAllByRole('option', { name: 'Zerodha' }))[0]);
      await waitFor(() => expect(screen.getByTestId('reconcile')).toHaveTextContent('reconcile:broker-1'));

      fireEvent.click(screen.getByRole('button', { name: /Reconcile/ }));
      expect(screen.queryByTestId('reconcile')).not.toBeInTheDocument();
    });
  });
});
