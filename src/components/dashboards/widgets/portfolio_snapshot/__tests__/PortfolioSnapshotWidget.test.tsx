import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: (p: { source: unknown; title: string; kpi?: unknown }) => (
    <div data-testid="kpi-dialog" data-title={p.title} data-kpi={String(p.kpi !== undefined)} data-source={JSON.stringify(p.source)} />
  ),
}));

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { InvestmentSummary } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { positionsValueRequest } from '../../investmentsLoansKit/kit';
import { PortfolioSnapshotWidget } from '../PortfolioSnapshotWidget';

const summary = (over: Partial<InvestmentSummary> = {}): InvestmentSummary => ({
  totalInvested: 1020000,
  totalCurrentValue: 1248600,
  totalUnrealized: 228600,
  totalUnrealizedPercent: 22.41,
  totalRealized: 0,
  totalDividends: 0,
  totalCharges: 0,
  totalPnl: 228600,
  xirr: 14.23,
  byBroker: [],
  byInstrumentType: [],
  dayChange: 8420,
  dayChangePct: 0.68,
  priceAsOf: '2026-10-09',
  previousPriceAsOf: '2026-10-08',
  ...over,
});

const respond = (data: InvestmentSummary) => vi.mocked(api.GET).mockResolvedValue({ data } as never);

describe('PortfolioSnapshotWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads GET /investments/summary under the investments summary key', async () => {
    respond(summary());
    const { queryClient } = renderWithQuery(<PortfolioSnapshotWidget />);
    await screen.findByText('₹12,48,600');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/summary');
    expect(queryClient.getQueryData(keys.investments.summary())).toBeTruthy();
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<PortfolioSnapshotWidget />);
    expect(screen.getByTestId('portfolio-snapshot-loading')).toBeInTheDocument();
  });

  it('shows the error state when the summary fails', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('down'));
    renderWithQuery(<PortfolioSnapshotWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your portfolio");
  });

  it('an empty portfolio points at investments', async () => {
    respond(summary({ totalInvested: 0, totalCurrentValue: 0 }));
    renderWithQuery(<PortfolioSnapshotWidget />);
    expect(await screen.findByText('No holdings yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to investments' })).toHaveAttribute('href', '/investments');
  });

  it('shows value, day change since the previous price date, invested, unrealised P&L and XIRR', async () => {
    respond(summary());
    renderWithQuery(<PortfolioSnapshotWidget />);
    await screen.findByText('₹12,48,600');
    const change = screen.getByTestId('day-change');
    // Holdings' windows can differ (fund NAVs a day late): no single "since" date is claimed.
    expect(change).toHaveTextContent('+₹8,420 (+0.68%) since last update');
    expect(change).toHaveAttribute('title', "Each holding's change since its previous evening price; latest prices from 09/10/2026");
    expect(change.className).toContain('emerald');
    expect(screen.getByText('₹10,20,000')).toBeInTheDocument();
    expect(screen.getByText('+₹2,28,600 (+22.41%)')).toBeInTheDocument();
    expect(screen.getByText('14.2%')).toBeInTheDocument();
  });

  it('a fall reads rose with a minus; decimal strings are read as numbers', async () => {
    respond(summary({ dayChange: '-1500.40', dayChangePct: '-0.12', totalUnrealized: -5000, totalUnrealizedPercent: -0.5 }));
    renderWithQuery(<PortfolioSnapshotWidget />);
    const change = await screen.findByTestId('day-change');
    expect(change).toHaveTextContent('−₹1,500 (−0.12%) since last update');
    expect(change.className).toContain('rose');
    expect(screen.getByText('−₹5,000 (−0.50%)')).toBeInTheDocument();
  });

  it('hides the day change until two prices exist, and XIRR reads — when unknown', async () => {
    respond(summary({ dayChange: null, dayChangePct: null, previousPriceAsOf: null, xirr: null }));
    renderWithQuery(<PortfolioSnapshotWidget />);
    await screen.findByText('₹12,48,600');
    expect(screen.queryByTestId('day-change')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('tapping the value opens the open holdings behind it (headless ad-hoc KPI over positions)', async () => {
    respond(summary());
    renderWithQuery(<PortfolioSnapshotWidget />);
    expect(screen.queryByTestId('kpi-dialog')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /— view underlying data for Portfolio value$/ }));
    const dialog = await screen.findByTestId('kpi-dialog');
    expect(dialog).toHaveAttribute('data-title', 'Portfolio value');
    expect(dialog).toHaveAttribute('data-kpi', 'false');
    expect(JSON.parse(dialog.getAttribute('data-source')!)).toEqual({ kind: 'adhoc', request: positionsValueRequest() });
  });
});
