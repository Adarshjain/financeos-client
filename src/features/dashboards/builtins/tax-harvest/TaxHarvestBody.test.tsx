import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/features/dashboards/builtins/investmentsLoansParts', async () => {
  const actual = await vi.importActual<typeof import('@/features/dashboards/builtins/investmentsLoansParts')>('../investmentsLoansParts');
  return {
    ...actual,
    LazyReportUnderlyingDialog: (p: { request: unknown; title?: string; onClose: () => void }) => (
      <button type="button" data-testid="underlying" data-request={JSON.stringify(p.request)} data-title={p.title} onClick={p.onClose} />
    ),
  };
});

vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportRowBreakdownDialog: (p: { datasource: string; rowId: string; title: string; onClose: () => void }) => (
    <button type="button" data-testid="breakdown" data-datasource={p.datasource} data-row-id={p.rowId} data-title={p.title} onClick={p.onClose} />
  ),
}));
import { bookedGainsRequest } from '@/features/dashboards/builtins/investmentsLoansData';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { TaxHarvestLot, TaxHarvestResponse } from '@/lib/taxHarvest.types';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { TaxHarvestBody } from './TaxHarvestBody';
import { lotKeys, TAX_HARVEST_LOTS } from './taxHarvestModel';

pinClock();

const lot = (over: Partial<TaxHarvestLot> = {}): TaxHarvestLot => ({
  holdingId: 'h1',
  instrumentId: 'i1',
  instrument: 'Nifty 50 ETF',
  broker: 'Zerodha',
  assetClass: 'EQUITY',
  taxClass: 'EQUITY_ORIENTED',
  buyDate: '2024-01-10',
  quantity: 100,
  costPerUnit: 200,
  cost: 20000,
  price: 512,
  value: 51200,
  gain: 31200,
  term: 'long',
  longTermOn: '2025-01-11',
  daysToLongTerm: 0,
  grandfathered: false,
  ...over,
});

type Summary = NonNullable<TaxHarvestResponse['summary']>;
// The server sends `summary: null` for a past FY (the generated type only says optional).
const NULL_SUMMARY = null as unknown as undefined;

const harvest = (over: { realised?: Partial<TaxHarvestResponse['realised']>; summary?: Partial<Summary> | null; lots?: TaxHarvestLot[] } = {}): TaxHarvestResponse => ({
  fy: 2026,
  fyStart: '2026-04-01',
  fyEnd: '2027-03-31',
  realised: {
    stcg: 12000, stcl: 2000, ltcg: 50000, ltcl: 2000,
    netStcg: 10000, netLtcg: 48000, netEquityLtcg: 48000,
    stclCarriedForward: 0, ltclCarriedForward: 0,
    slabGains: 0,
    otherGains: { shortTerm: 0, longTerm: 0, total: 0 },
    exemptionLimit: 125000, exemptionUsed: 48000, exemptionLeft: 77000, taxableLtcg: 0,
    ...over.realised,
  },
  summary: over.summary === null ? NULL_SUMMARY : {
    harvestableLtcg: 31200,
    unrealisedLongTermEquityGain: 31200,
    turningLongTermSoon: { withinDays: 30, count: 0, gain: 0 },
    harvestableLosses: { shortTerm: 0, longTerm: 0, total: 0 },
    ...over.summary,
  },
  openLots: { items: over.lots ?? [lot()], page: 0, size: TAX_HARVEST_LOTS, totalElements: 1, totalPages: 1 },
});
const respond = (data: TaxHarvestResponse) => vi.mocked(api.GET).mockResolvedValue({ data } as never);

describe('lotKeys', () => {
  it('is unique even for identical lots of one holding', () => {
    const keysOf = lotKeys([lot(), lot(), lot({ quantity: 5 })]);
    expect(new Set(keysOf).size).toBe(3);
  });
});

describe('TaxHarvestBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('asks for the current FY and the first page of open lots, cached under investments', async () => {
    respond(harvest());
    const { queryClient } = renderWithQuery(<TaxHarvestBody />);
    await screen.findByTestId('ltcg-exemption');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/tax/harvest', {
      params: { query: { page: 0, size: TAX_HARVEST_LOTS } },
    });
    expect(queryClient.getQueryData(keys.investments.taxHarvest({ page: 0, size: TAX_HARVEST_LOTS }))).toBeTruthy();
  });

  it('shows the exemption used and left, the raw equity P&L by term, the after-set-off lines and the footer', async () => {
    respond(harvest());
    renderWithQuery(<TaxHarvestBody />);
    const bar = await screen.findByTestId('ltcg-exemption');
    expect(bar).toHaveTextContent('₹77,000 left');
    expect(bar).toHaveTextContent('₹48,000 used of ₹1.25L');
    expect(within(bar).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '38.4');
    expect(screen.getByRole('button', { name: '+₹10,000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+₹48,000' })).toBeInTheDocument();
    const after = screen.getByRole('group', { name: 'After set-off' });
    expect(within(after).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Net short-term after set-off').nextSibling).toHaveTextContent('+₹10,000');
    expect(screen.getByText('Net long-term after set-off').nextSibling).toHaveTextContent('+₹48,000');
    expect(screen.getByText('Taxable LTCG').nextSibling).toHaveTextContent('₹0');
    expect(screen.queryByText(/carried forward/)).not.toBeInTheDocument();
    expect(screen.queryByText('Equity LTCG after set-off')).not.toBeInTheDocument();
    expect(screen.getByText('LTCG you could book tax-free').nextSibling).toHaveTextContent('₹31,200');
    expect(screen.getByText('Not tax advice')).toBeInTheDocument();
  });

  it('a short-term loss reads with a minus sign', async () => {
    respond(harvest({ realised: { stcg: 1000, stcl: 6000 } }));
    renderWithQuery(<TaxHarvestBody />);
    expect(await screen.findByRole('button', { name: '−₹5,000' })).toBeInTheDocument();
  });

  it('extra lines appear only when they apply: other-class LTCG, carry-forward, slab gains, other assets, lots turning soon, losses to book', async () => {
    respond(harvest({
      realised: {
        netLtcg: 60000, netEquityLtcg: 48000, stclCarriedForward: 3000, ltclCarriedForward: 1500, slabGains: 800,
        otherGains: { shortTerm: 100, longTerm: 5000, total: 5100 },
      },
      summary: { turningLongTermSoon: { withinDays: 30, count: 2, gain: 4000 }, harvestableLosses: { shortTerm: -500, longTerm: -1500, total: -2000 } },
    }));
    renderWithQuery(<TaxHarvestBody />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.getByText('Equity LTCG after set-off').nextSibling).toHaveTextContent('+₹48,000');
    expect(screen.getByText('Short-term losses carried forward').nextSibling).toHaveTextContent('₹3,000');
    expect(screen.getByText('Long-term losses carried forward').nextSibling).toHaveTextContent('₹1,500');
    expect(screen.getByText('Slab-rate gains booked').nextSibling).toHaveTextContent('+₹800');
    expect(screen.getByText('Other assets (gold, international, debt)').nextSibling).toHaveTextContent('ST +₹100 · LT +₹5,000');
    expect(screen.getByText('2 lots turn long-term in 30 days').nextSibling).toHaveTextContent('+₹4,000');
    expect(screen.getByText('Losses you could book').nextSibling).toHaveTextContent('−₹2,000');
  });

  it('a past year has no summary lines', async () => {
    respond(harvest({ summary: null }));
    renderWithQuery(<TaxHarvestBody />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.queryByText('LTCG you could book tax-free')).not.toBeInTheDocument();
  });

  it('lists open lots with term, when it turns long term and the caveat; a lot opens the holding breakdown', async () => {
    respond(harvest({ lots: [
      lot(),
      lot({ holdingId: 'h2', instrumentId: 'i2', instrument: 'Tata Motors', term: 'short', buyDate: '2026-08-01', longTermOn: '2027-08-02', daysToLongTerm: 1, gain: -4000, grandfathered: true }),
    ] }));
    renderWithQuery(<TaxHarvestBody />);
    const rows = within(await screen.findByRole('list', { name: 'Open lots' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(within(rows[0]).getByText('Nifty 50 ETF'));
    const dialog = screen.getByTestId('breakdown');
    expect(dialog).toHaveAttribute('data-datasource', 'positions');
    expect(dialog).toHaveAttribute('data-row-id', 'h1');
    expect(dialog).toHaveAttribute('data-title', 'Nifty 50 ETF');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('breakdown')).not.toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('Long term · Bought 10 Jan 2024');
    expect(rows[0]).toHaveTextContent('+₹31,200');
    expect(rows[1]).toHaveTextContent('Short term · Long-term on 2 Aug 2027 · 1 day · cost may be higher');
    expect(rows[1]).toHaveTextContent('−₹4,000');
  });

  it('no open lots: no list', async () => {
    respond(harvest({ lots: [] }));
    renderWithQuery(<TaxHarvestBody />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.queryByRole('list', { name: 'Open lots' })).not.toBeInTheDocument();
  });

  it("a booked figure opens that term's realised lots", async () => {
    respond(harvest());
    renderWithQuery(<TaxHarvestBody />);
    await userEvent.click(await screen.findByRole('button', { name: '+₹48,000' }));
    expect(JSON.parse(screen.getByTestId('underlying').getAttribute('data-request') as string)).toEqual(bookedGainsRequest('long'));
    await userEvent.click(screen.getByTestId('underlying'));
    await userEvent.click(screen.getByRole('button', { name: '+₹10,000' }));
    expect(JSON.parse(screen.getByTestId('underlying').getAttribute('data-request') as string)).toEqual(bookedGainsRequest('short'));
  });

  it('a booked figure\'s dialog is titled with the term and the figure', async () => {
    respond(harvest());
    renderWithQuery(<TaxHarvestBody />);
    await userEvent.click(await screen.findByRole('button', { name: '+₹48,000' }));
    expect(screen.getByTestId('underlying')).toHaveAttribute('data-title', 'Equity long-term P&L this FY · +₹48,000');
    await userEvent.click(screen.getByTestId('underlying'));
    await userEvent.click(screen.getByRole('button', { name: '+₹10,000' }));
    expect(screen.getByTestId('underlying')).toHaveAttribute('data-title', 'Equity short-term P&L this FY · +₹10,000');
  });

  it('skeleton while loading, Retry on failure', async () => {
    vi.mocked(api.GET).mockReturnValueOnce(new Promise(() => {}) as never);
    const first = renderWithQuery(<TaxHarvestBody />);
    expect(screen.getByTestId('tax-harvest-loading')).toBeInTheDocument();
    first.unmount();
    vi.mocked(api.GET).mockRejectedValueOnce(new Error('x'));
    renderWithQuery(<TaxHarvestBody />);
    expect(await screen.findByText("Couldn't load your capital gains")).toBeInTheDocument();
    respond(harvest());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('ltcg-exemption')).toBeInTheDocument();
  });
});
