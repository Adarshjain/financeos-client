import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportRowBreakdownDialog: (p: { datasource: string; rowId: string; title: string; onClose: () => void }) => (
    <button type="button" data-testid="breakdown" data-datasource={p.datasource} data-row-id={p.rowId} data-title={p.title} onClick={p.onClose} />
  ),
}));
import { api } from '@/lib/api/client';
import type { Position } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { dayMonthShort, moverWindow } from './moverWindow';
import { TopMoversBody } from './TopMoversBody';

let seq = 0;
const pos = (name: string, pct: number | null, over: Partial<Position> = {}): Position => ({
  holdingId: `h-${name}-${seq++}`,
  brokerAccountId: 'b',
  brokerName: 'Zerodha',
  provider: 'zerodha',
  instrument: { id: `i-${name}`, type: 'stock', name },
  quantity: 10,
  lastPrice: 1234.5,
  dayChangePct: pct,
  dayChange: pct == null ? null : pct * 10,
  previousClose: 98,
  previousCloseAsOf: '2026-10-08',
  lastPriceAsOf: '2026-10-09',
  ...over,
});
const respond = (positions: Position[]) =>
  vi.mocked(api.GET).mockResolvedValue({ data: { positions } } as never);

describe('TopMoversBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('lists gainers first, largest % first, each row with price and move; a row opens the holding breakdown', async () => {
    respond([pos('Small', 1), pos('Big', 3), pos('Down', -2)]);
    renderWithQuery(<TopMoversBody n={5} />);
    const rows = within(await screen.findByRole('list', { name: 'Gainers' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Big'),
      expect.stringContaining('Small'),
    ]);
    expect(rows[0]).toHaveTextContent('₹1,234.50');
    expect(rows[0]).toHaveTextContent('+3%');
    expect(rows[0]).toHaveTextContent('+₹30');
    expect(within(rows[0]).queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(within(rows[0]).getByText('Big'));
    const dialog = screen.getByTestId('breakdown');
    expect(dialog).toHaveAttribute('data-datasource', 'positions');
    expect(dialog.getAttribute('data-row-id')).toMatch(/^h-Big-/);
    expect(dialog).toHaveAttribute('data-title', 'Big');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('breakdown')).not.toBeInTheDocument();
  });

  it('the switch shows the losers, biggest fall first', async () => {
    respond([pos('Up', 2), pos('Down', -1), pos('Crash', -4)]);
    renderWithQuery(<TopMoversBody n={5} />);
    await screen.findByRole('list', { name: 'Gainers' });
    await userEvent.click(screen.getByRole('radio', { name: 'Losers' }));
    const rows = within(screen.getByRole('list', { name: 'Losers' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Crash'), expect.stringContaining('Down')]);
    expect(rows[0]).toHaveTextContent('−4%');
  });

  it('opens on Losers when nothing went up; a side with no rows says so', async () => {
    respond([pos('Down', -1)]);
    renderWithQuery(<TopMoversBody n={5} />);
    expect(await screen.findByRole('list', { name: 'Losers' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Gainers' }));
    expect(screen.getByText('Nothing went up')).toBeInTheDocument();
  });

  it('keeps n rows per side', async () => {
    respond([pos('A', 1), pos('B', 2), pos('C', 3), pos('D', 4)]);
    renderWithQuery(<TopMoversBody n={3} />);
    expect(within(await screen.findByRole('list', { name: 'Gainers' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('footer: one shared window says since its date; differing windows say since last update and rows show their own dates', async () => {
    respond([pos('A', 1), pos('B', 2)]);
    const { unmount } = renderWithQuery(<TopMoversBody n={5} />);
    expect(await screen.findByText('Since 8 Oct, updated each evening')).toBeInTheDocument();
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    unmount();
    respond([pos('A', 1), pos('Fund', 2, { previousCloseAsOf: '2026-10-07', lastPriceAsOf: '2026-10-08' })]);
    renderWithQuery(<TopMoversBody n={5} />);
    expect(await screen.findByText('Since last update, updated each evening')).toBeInTheDocument();
    expect(screen.getByText(/7 Oct → 8 Oct/)).toBeInTheDocument();
  });

  it('moverWindow: both dates, or just the start without a price date, or nothing', () => {
    const base = { holdingId: 'h', instrumentId: 'i', name: 'N', price: 1, change: 1, changePct: 1 };
    expect(moverWindow({ ...base, previousCloseAsOf: '2026-10-08', lastPriceAsOf: '2026-10-09' })).toBe('08/10 → 09/10');
    expect(moverWindow({ ...base, previousCloseAsOf: '2026-10-08', lastPriceAsOf: null })).toBe('since 08/10');
    expect(moverWindow({ ...base, previousCloseAsOf: null, lastPriceAsOf: null })).toBeNull();
    expect(moverWindow({ ...base, previousCloseAsOf: '2026-10-08', lastPriceAsOf: '2026-10-09' }, dayMonthShort)).toBe('8 Oct → 9 Oct');
    expect(moverWindow({ ...base, previousCloseAsOf: '2026-10-08', lastPriceAsOf: null }, dayMonthShort)).toBe('since 8 Oct');
  });

  it('skeleton while loading, empty state without two prices, Retry on failure', async () => {
    vi.mocked(api.GET).mockReturnValueOnce(new Promise(() => {}) as never);
    const first = renderWithQuery(<TopMoversBody n={5} />);
    expect(screen.getByTestId('movers-loading')).toBeInTheDocument();
    first.unmount();
    respond([pos('Flat', 0)]);
    const second = renderWithQuery(<TopMoversBody n={5} />);
    const title = await screen.findByText('No price moves yet');
    expect(title).toBeInTheDocument();
    // Stacked and centred (title, then description), not laid out in one row.
    expect(title.closest('div')?.className).toMatch(/flex-col/);
    expect(title.closest('div')?.className).toMatch(/text-center/);
    second.unmount();
    vi.mocked(api.GET).mockRejectedValue(new Error('x'));
    renderWithQuery(<TopMoversBody n={5} />);
    expect(await screen.findByText("Couldn't load your holdings")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
