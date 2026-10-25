import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('../investmentsLoansParts', async () => {
  const actual = await vi.importActual<typeof import('../investmentsLoansParts')>('../investmentsLoansParts');
  return {
    ...actual,
    LazyReportUnderlyingDialog: (p: { request: unknown; title?: string; onClose: () => void }) => (
      <button type="button" data-testid="underlying" data-request={JSON.stringify(p.request)} data-title={p.title} onClick={p.onClose} />
    ),
  };
});

import { api } from '@/lib/api/client';
import type { InvestmentSummary } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { positionsValueRequest } from '../investmentsLoansData';
import { PortfolioSnapshotBody } from './PortfolioSnapshotBody';

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

describe('PortfolioSnapshotBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the value, the day move since last update, then invested, unrealised P&L and XIRR', async () => {
    respond(summary());
    renderWithQuery(<PortfolioSnapshotBody />);
    expect(await screen.findByRole('button', { name: /₹12,48,600/ })).toBeInTheDocument();
    expect(screen.getByTestId('day-change')).toHaveTextContent('+₹8,420 (+0.68%) since last update');
    expect(screen.getByText('Invested').nextSibling).toHaveTextContent('₹10,20,000');
    expect(screen.getByText('Unrealised P&L').nextSibling).toHaveTextContent('+₹2,28,600 (+22.41%)');
    expect(screen.getByText('XIRR').nextSibling).toHaveTextContent('14.2%');
  });

  it('a falling day reads with a minus sign; no day change, no line; no XIRR is a dash', async () => {
    respond(summary({ dayChange: -2100, dayChangePct: -0.17 }));
    const { unmount } = renderWithQuery(<PortfolioSnapshotBody />);
    expect(await screen.findByTestId('day-change')).toHaveTextContent('−₹2,100 (−0.17%)');
    unmount();
    respond(summary({ dayChange: null, dayChangePct: null, xirr: null }));
    renderWithQuery(<PortfolioSnapshotBody />);
    await screen.findByRole('button', { name: /₹12,48,600/ });
    expect(screen.queryByTestId('day-change')).not.toBeInTheDocument();
    expect(screen.getByText('XIRR').nextSibling).toHaveTextContent('—');
  });

  it('shows its skeleton while loading', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<PortfolioSnapshotBody />);
    expect(screen.getByTestId('portfolio-snapshot-loading')).toBeInTheDocument();
  });

  it('a failed load says what failed and Retry fetches again', async () => {
    vi.mocked(api.GET).mockRejectedValueOnce(new Error('boom'));
    renderWithQuery(<PortfolioSnapshotBody />);
    expect(await screen.findByText("Couldn't load your portfolio")).toBeInTheDocument();
    respond(summary());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: /₹12,48,600/ })).toBeInTheDocument();
    // The summary was asked for twice (the failed load, then Retry); the top holdings' positions are a separate query.
    expect(vi.mocked(api.GET).mock.calls.filter((call) => call[0] === '/api/v1/investments/summary')).toHaveLength(2);
  });

  it('no holdings: an empty state with a way to the Investments page', async () => {
    respond(summary({ totalInvested: 0, totalCurrentValue: 0 }));
    renderWithQuery(<PortfolioSnapshotBody />);
    expect(await screen.findByText('No holdings yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to investments' }));
    expect(nav.push).toHaveBeenCalledWith(expect.stringContaining('/investments'));
  });

  it('the value opens the open holdings behind it, and closing unmounts the dialog', async () => {
    respond(summary());
    renderWithQuery(<PortfolioSnapshotBody />);
    await userEvent.click(await screen.findByRole('button', { name: /₹12,48,600/ }));
    const dialog = screen.getByTestId('underlying');
    expect(JSON.parse(dialog.getAttribute('data-request') as string)).toEqual(positionsValueRequest());
    await userEvent.click(dialog);
    expect(screen.queryByTestId('underlying')).not.toBeInTheDocument();
  });
  it('the value\'s dialog is titled with the figure', async () => {
    respond(summary());
    renderWithQuery(<PortfolioSnapshotBody />);
    await userEvent.click(await screen.findByRole('button', { name: /₹12,48,600/ }));
    expect(screen.getByTestId('underlying')).toHaveAttribute('data-title', 'Portfolio value · ₹12,48,600');
  });

  it('lists the three largest holdings with quantity and day move, each linking to its page', async () => {
    const position = (name: string, value: number, pct: number | null) => ({
      holdingId: `h-${name}`, brokerAccountId: 'b', brokerName: 'Zerodha', provider: 'zerodha',
      instrument: { id: `i-${name}`, type: 'stock', name: `${name} Ltd`, symbol: name },
      quantity: 10, currentValue: value, dayChangePct: pct,
    });
    vi.mocked(api.GET).mockImplementation(((path: string) =>
      Promise.resolve({
        data: path === '/api/v1/investments/positions'
          ? { positions: [position('TCS', 1000, -0.8), position('INFY', 6000, 2.1), position('RELIANCE', 4000, 1.4), position('ITC', 100, 0.2)] }
          : summary(),
      })) as never);
    renderWithQuery(<PortfolioSnapshotBody />);
    const rows = within(await screen.findByRole('list', { name: 'Top holdings' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('INFY'),
      expect.stringContaining('RELIANCE'),
      expect.stringContaining('TCS'),
    ]);
    expect(rows[0]).toHaveTextContent('10 sh');
    expect(rows[0]).toHaveTextContent('+2.1%');
    expect(rows[2]).toHaveTextContent('−0.8%');
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', expect.stringContaining('/investments/i-INFY'));
  });

  it('no positions: no holdings list', async () => {
    respond(summary());
    renderWithQuery(<PortfolioSnapshotBody />);
    await screen.findByRole('button', { name: /₹12,48,600/ });
    expect(screen.queryByRole('list', { name: 'Top holdings' })).not.toBeInTheDocument();
  });
});
