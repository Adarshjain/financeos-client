import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/RowBreakdownDialog', () => ({
  RowBreakdownDialog: (p: { datasource: string; rowId: string; title: string }) => (
    <div data-testid="breakdown-dialog" data-datasource={p.datasource} data-row={p.rowId} data-title={p.title} />
  ),
}));

import { api } from '@/lib/api/client';
import type { Position } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { moversCount, topMovers } from '../topMovers';
import { TopMoversWidget } from '../TopMoversWidget';

let seq = 0;
const pos = (name: string, pct: number | null, over: Partial<Position> = {}): Position => ({
  holdingId: `h-${name}-${seq++}`,
  brokerAccountId: 'b',
  brokerName: 'Zerodha',
  provider: 'zerodha',
  instrument: { id: `i-${name}`, type: 'stock', name },
  quantity: 10,
  lastPrice: 100,
  dayChangePct: pct,
  dayChange: pct == null ? null : pct * 10,
  previousClose: 98,
  previousCloseAsOf: '2026-10-08',
  ...over,
});

describe('topMovers', () => {
  it('splits gainers (largest % first) and losers (largest fall first), n each', () => {
    const movers = topMovers(
      [pos('A', 1), pos('B', 3), pos('C', 2), pos('D', -1), pos('E', -4), pos('F', 0)],
      2,
    );
    expect(movers.gainers.map((m) => m.name)).toEqual(['B', 'C']);
    expect(movers.losers.map((m) => m.name)).toEqual(['E', 'D']);
  });

  it('leaves out unmoved, unpriced and closed holdings; reads decimal strings', () => {
    const movers = topMovers(
      [pos('Flat', 0), pos('NoPrev', null), pos('Closed', 5, { quantity: 0 }), pos('Str', null, { dayChangePct: '2.5', dayChange: '25' })],
      5,
    );
    expect(movers.gainers.map((m) => m.name)).toEqual(['Str']);
    expect(movers.gainers[0]).toMatchObject({ change: 25, changePct: 2.5, price: 100 });
    expect(movers.losers).toEqual([]);
  });

  it('since = the previous-close date the listed movers share; mixed (since null) when their windows differ; null without movers', () => {
    const same = topMovers(
      [pos('A', 1, { lastPriceAsOf: '2026-10-09' }), pos('B', -1, { lastPriceAsOf: '2026-10-09' })],
      5,
    );
    expect(same).toMatchObject({ since: '2026-10-08', mixed: false });
    const mixed = topMovers(
      [
        pos('Fund', 1, { previousCloseAsOf: '2026-10-07', lastPriceAsOf: '2026-10-08' }),
        pos('Stock', -1, { previousCloseAsOf: '2026-10-08', lastPriceAsOf: '2026-10-09' }),
      ],
      5,
    );
    expect(mixed).toMatchObject({ since: null, mixed: true });
    // Same previous close but a different latest price date is a different window too.
    expect(topMovers([pos('A', 1, { lastPriceAsOf: '2026-10-09' }), pos('B', 2, { lastPriceAsOf: '2026-10-10' })], 5).mixed).toBe(true);
    // Only listed movers count: an unmoved holding is in no list.
    expect(topMovers([pos('Flat', 0)], 5)).toMatchObject({ since: null, mixed: false });
    expect(topMovers([pos('NoPrev', null)], 5).since).toBeNull();
  });

  it('mixed windows: the footer says "Since last update" and each row shows its own previous close → price dates', async () => {
    respond([
      pos('Fund', 2, { previousCloseAsOf: '2026-10-07', lastPriceAsOf: '2026-10-08', lastPrice: 12.5 }),
      pos('Stock', 1, { previousCloseAsOf: '2026-10-08', lastPriceAsOf: '2026-10-09', lastPrice: 100 }),
    ]);
    renderWithQuery(<TopMoversWidget n={5} />);
    const rows = within(await screen.findByRole('list', { name: 'Gainers' })).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('₹12.50 · 07/10 → 08/10');
    expect(rows[1]).toHaveTextContent('₹100 · 08/10 → 09/10');
    expect(screen.getByText('Since last update, updated each evening')).toBeInTheDocument();
    expect(screen.queryByText(/Since 0/)).not.toBeInTheDocument();
  });

  it('a shared window keeps the dates in the footer only', async () => {
    respond([pos('A', 2, { lastPriceAsOf: '2026-10-09' }), pos('B', 1, { lastPriceAsOf: '2026-10-09' })]);
    renderWithQuery(<TopMoversWidget n={5} />);
    const rows = within(await screen.findByRole('list', { name: 'Gainers' })).getAllByRole('button');
    expect(rows[0]).not.toHaveTextContent('→');
    expect(screen.getByText('Since 08/10, updated each evening')).toBeInTheDocument();
  });

  it('moversCount clamps n to 3–10 and defaults to 5', () => {
    expect(moversCount(undefined)).toBe(5);
    expect(moversCount('7')).toBe(5);
    expect(moversCount(2.5)).toBe(5);
    expect(moversCount(1)).toBe(3);
    expect(moversCount(50)).toBe(10);
    expect(moversCount(7)).toBe(7);
  });
});

const respond = (positions: Position[]) => vi.mocked(api.GET).mockResolvedValue({ data: { positions } } as never);

describe('TopMoversWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads positions and shows the skeleton meanwhile', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<TopMoversWidget n={5} />);
    expect(screen.getByTestId('top-movers-loading')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/positions');
  });

  it('shows the error state', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('x'));
    renderWithQuery(<TopMoversWidget n={5} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your holdings");
  });

  it('is empty until holdings have a previous close', async () => {
    respond([pos('A', null), pos('B', null)]);
    renderWithQuery(<TopMoversWidget n={5} />);
    expect(await screen.findByText('No price moves yet')).toBeInTheDocument();
  });

  it('lists the top n gainers with price, % and ₹ change, and the as-of date once', async () => {
    respond([pos('Tata', 3.4, { lastPrice: 950.5, dayChange: 1200 }), pos('HDFC', 1.9), pos('Infy', 1), pos('ITC', -2.1)]);
    renderWithQuery(<TopMoversWidget n={2} />);
    const list = await screen.findByRole('list', { name: 'Gainers' });
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Tata');
    expect(rows[0]).toHaveTextContent('₹950.50');
    expect(rows[0]).toHaveTextContent('+3.40%');
    expect(rows[0]).toHaveTextContent('+₹1,200');
    expect(rows[1]).toHaveTextContent('HDFC');
    expect(screen.getAllByText('Since 08/10, updated each evening')).toHaveLength(1);
  });

  it('the Losers tab lists the falls, biggest first', async () => {
    respond([pos('Up', 1), pos('Down', -1), pos('Crash', -5)]);
    renderWithQuery(<TopMoversWidget n={5} />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Losers' }));
    const rows = within(screen.getByRole('list', { name: 'Losers' })).getAllByRole('button');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Crash'), expect.stringContaining('Down')]);
    expect(rows[0]).toHaveTextContent('−5.00%');
  });

  it('opens on Losers when nothing went up; an empty side says so', async () => {
    respond([pos('Down', -1)]);
    renderWithQuery(<TopMoversWidget n={5} />);
    expect(await screen.findByRole('list', { name: 'Losers' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Gainers' }));
    expect(screen.getByText('Nothing went up')).toBeInTheDocument();
  });

  it('a row opens that holding\'s positions breakdown', async () => {
    const tata = pos('Tata', 3.4);
    respond([tata]);
    renderWithQuery(<TopMoversWidget n={5} />);
    await userEvent.click(await screen.findByRole('button', { name: /Tata/ }));
    const dialog = await screen.findByTestId('breakdown-dialog');
    expect(dialog).toHaveAttribute('data-datasource', 'positions');
    expect(dialog).toHaveAttribute('data-row', tata.holdingId);
    expect(dialog).toHaveAttribute('data-title', 'Tata');
  });
});
