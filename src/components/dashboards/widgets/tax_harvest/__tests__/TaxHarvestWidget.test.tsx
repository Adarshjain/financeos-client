import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: (p: { source: unknown; title: string }) => (
    <div data-testid="kpi-dialog" data-title={p.title} data-source={JSON.stringify(p.source)} />
  ),
}));
vi.mock('@/components/reports/underlying/RowBreakdownDialog', () => ({
  RowBreakdownDialog: (p: { datasource: string; rowId: string; title: string }) => (
    <div data-testid="breakdown-dialog" data-datasource={p.datasource} data-row={p.rowId} data-title={p.title} />
  ),
}));

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { TaxHarvestLot, TaxHarvestResponse } from '@/lib/taxHarvest.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { bookedGainsRequest } from '../../investmentsLoansKit/kit';
import { lotKeys, TAX_HARVEST_LOTS, TaxHarvestWidget } from '../TaxHarvestWidget';

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

describe('TaxHarvestWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('asks for the current FY and the first page of open lots, cached under investments', async () => {
    respond(harvest());
    const { queryClient } = renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/tax/harvest', {
      params: { query: { page: 0, size: TAX_HARVEST_LOTS } },
    });
    expect(queryClient.getQueryData(keys.investments.taxHarvest({ page: 0, size: TAX_HARVEST_LOTS }))).toBeTruthy();
    expect(keys.investments.taxHarvest({ page: 0, size: 5 }).slice(0, 1)).toEqual(keys.investments.all);
  });

  it('loading and error states', async () => {
    vi.mocked(api.GET).mockReturnValueOnce(new Promise(() => {}) as never);
    const { unmount } = renderWithQuery(<TaxHarvestWidget />);
    expect(screen.getByTestId('tax-harvest-loading')).toBeInTheDocument();
    unmount();
    vi.mocked(api.GET).mockRejectedValue(new Error('x'));
    renderWithQuery(<TaxHarvestWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your capital gains");
  });

  it('shows the exemption used / left, raw equity P&L by term (tappable), after-set-off lines, harvestable LTCG and the footer', async () => {
    respond(harvest());
    renderWithQuery(<TaxHarvestWidget />);
    const bar = await screen.findByTestId('ltcg-exemption');
    expect(bar).toHaveTextContent('₹77,000 left');
    expect(bar).toHaveTextContent('₹48,000 used of ₹1.25L');
    expect(within(bar).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '38');
    // Raw: stcg − stcl and ltcg − ltcl; the accessible name starts with the figure.
    expect(screen.getByRole('button', { name: '+₹10,000 — view underlying data for Short-term P&L' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+₹48,000 — view underlying data for Long-term P&L' })).toBeInTheDocument();
    const after = screen.getByText('Taxable LTCG').closest('dl')!;
    expect(within(after).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Net short-term after set-off').nextSibling).toHaveTextContent('+₹10,000');
    expect(screen.getByText('Net long-term after set-off').nextSibling).toHaveTextContent('+₹48,000');
    expect(screen.getByText('Taxable LTCG').nextSibling).toHaveTextContent('₹0');
    expect(screen.queryByText(/carried forward/)).not.toBeInTheDocument();
    expect(screen.queryByText('Equity LTCG after set-off')).not.toBeInTheDocument();
    expect(screen.getByText('LTCG you could book tax-free')).toBeInTheDocument();
    expect(screen.getByText('Not tax advice')).toBeInTheDocument();
  });

  it('hides slab, other-asset, turning-soon and loss lines when zero', async () => {
    respond(harvest());
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.queryByText('Slab-rate gains booked')).not.toBeInTheDocument();
    expect(screen.queryByText(/Other assets/)).not.toBeInTheDocument();
    expect(screen.queryByText(/long-term in/)).not.toBeInTheDocument();
    expect(screen.queryByText('Losses you could book')).not.toBeInTheDocument();
  });

  it('shows slab gains, other assets (ST · LT, no drill), lots turning long term soon and losses when present', async () => {
    respond(harvest({
      realised: { slabGains: 4200, otherGains: { shortTerm: -1000, longTerm: 6000, total: 5000 } },
      summary: {
        turningLongTermSoon: { withinDays: 30, count: 2, gain: 9000 },
        harvestableLosses: { shortTerm: -3000, longTerm: -500, total: -3500 },
      },
    }));
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.getByText('Slab-rate gains booked').nextSibling).toHaveTextContent('+₹4,200');
    const other = screen.getByText('Other assets (gold, international, debt)');
    expect(other.nextSibling).toHaveTextContent('ST −₹1,000 · LT +₹6,000');
    expect(within(other.parentElement!).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('2 lots turn long-term in 30 days').nextSibling).toHaveTextContent('+₹9,000');
    expect(screen.getByText('Losses you could book').nextSibling).toHaveTextContent('−₹3,500');
  });

  it('lists open lots: term chip, gain, when a short lot turns long term, and the grandfathering caveat', async () => {
    respond(harvest({
      lots: [
        lot(),
        lot({ holdingId: 'h2', instrument: 'Infosys', term: 'short', gain: -1200, buyDate: '2026-02-01', longTermOn: '2027-02-02', daysToLongTerm: 115 }),
        lot({ holdingId: 'h3', instrument: 'Old HDFC', buyDate: '2016-05-01', grandfathered: true }),
        lot({ holdingId: 'h4', instrument: 'Debt fund', term: 'slab', longTermOn: null, daysToLongTerm: null, buyDate: '2024-06-01' }),
      ],
    }));
    renderWithQuery(<TaxHarvestWidget />);
    const rows = within(await screen.findByRole('list', { name: 'Open lots' })).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('Nifty 50 ETF');
    expect(rows[0]).toHaveTextContent('Long');
    expect(rows[0]).toHaveTextContent('Bought 10/01/2024');
    expect(rows[0]).toHaveTextContent('+₹31,200');
    expect(rows[1]).toHaveTextContent('Short');
    expect(rows[1]).toHaveTextContent('Long-term on 02/02/2027 · 115 days');
    expect(rows[1]).toHaveTextContent('−₹1,200');
    expect(rows[2]).toHaveTextContent('cost may be higher');
    expect(rows[3]).toHaveTextContent('Slab');
    expect(rows[3]).toHaveTextContent('Bought 01/06/2024');
  });

  it('no open lots → no list', async () => {
    respond(harvest({ lots: [] }));
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.queryByRole('list', { name: 'Open lots' })).not.toBeInTheDocument();
  });

  it.each([
    ['Short-term P&L', 'short', 'Equity short-term P&L this FY'],
    ['Long-term P&L', 'long', 'Equity long-term P&L this FY'],
  ] as const)('%s opens the realised lots behind it', async (label, term, title) => {
    respond(harvest());
    renderWithQuery(<TaxHarvestWidget />);
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(`view underlying data for ${label}`) }));
    const dialog = await screen.findByTestId('kpi-dialog');
    expect(dialog).toHaveAttribute('data-title', title);
    expect(JSON.parse(dialog.getAttribute('data-source')!)).toEqual({ kind: 'adhoc', request: bookedGainsRequest(term) });
  });

  it('a lot opens its holding\'s positions breakdown', async () => {
    respond(harvest());
    renderWithQuery(<TaxHarvestWidget />);
    await userEvent.click(await screen.findByRole('button', { name: /Nifty 50 ETF/ }));
    const dialog = await screen.findByTestId('breakdown-dialog');
    expect(dialog).toHaveAttribute('data-datasource', 'positions');
    expect(dialog).toHaveAttribute('data-row', 'h1');
    expect(dialog).toHaveAttribute('data-title', 'Nifty 50 ETF');
  });

  it('pooled set-off: an other-asset short-term loss lowers net LTCG; the tappable LT figure stays the raw equity P&L', async () => {
    // Equity LTCG ₹2,00,000 and a gold short-term loss of ₹1,00,000 (the server's javadoc example).
    respond(harvest({
      realised: {
        stcg: 0, stcl: 0, ltcg: 200000, ltcl: 0,
        netStcg: 0, netLtcg: 100000, netEquityLtcg: 100000,
        otherGains: { shortTerm: -100000, longTerm: 0, total: -100000 },
        exemptionLimit: 125000, exemptionUsed: 100000, exemptionLeft: 25000, taxableLtcg: 0,
      },
    }));
    renderWithQuery(<TaxHarvestWidget />);
    const bar = await screen.findByTestId('ltcg-exemption');
    expect(bar).toHaveTextContent('₹25,000 left');
    expect(bar).toHaveTextContent('₹1,00,000 used of ₹1.25L');
    expect(screen.getByRole('button', { name: /view underlying data for Long-term P&L/ })).toHaveTextContent('+₹2,00,000');
    expect(screen.getByRole('button', { name: /view underlying data for Short-term P&L/ })).toHaveTextContent('₹0');
    expect(screen.getByText('Net long-term after set-off').nextSibling).toHaveTextContent('+₹1,00,000');
    expect(screen.getByText('Taxable LTCG').nextSibling).toHaveTextContent('₹0');
    expect(screen.getByText('Other assets (gold, international, debt)').nextSibling).toHaveTextContent('ST −₹1,00,000 · LT ₹0');
  });

  it('shows losses on the tappable figures (signed) and losses carried forward as plain lines', async () => {
    respond(harvest({
      realised: {
        stcg: 1000, stcl: 9000, ltcg: 0, ltcl: 4000,
        netStcg: 0, netLtcg: 0, netEquityLtcg: 0,
        stclCarriedForward: 8000, ltclCarriedForward: 4000,
        exemptionUsed: 0, exemptionLeft: 125000, taxableLtcg: 0,
      },
    }));
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.getByRole('button', { name: /Short-term P&L/ })).toHaveTextContent('−₹8,000');
    expect(screen.getByRole('button', { name: /Long-term P&L/ })).toHaveTextContent('−₹4,000');
    expect(screen.getByText('Short-term losses carried forward').nextSibling).toHaveTextContent('₹8,000');
    expect(screen.getByText('Long-term losses carried forward').nextSibling).toHaveTextContent('₹4,000');
    expect(within(screen.getByText('Short-term losses carried forward').parentElement!).queryByRole('button')).not.toBeInTheDocument();
  });

  it('other-class LTCG in the net: shows the equity part the exemption applies to, and taxable LTCG', async () => {
    respond(harvest({
      realised: {
        ltcg: 150000, ltcl: 0, netLtcg: 190000, netEquityLtcg: 150000,
        otherGains: { shortTerm: 0, longTerm: 40000, total: 40000 },
        exemptionUsed: 125000, exemptionLeft: 0, taxableLtcg: 65000,
      },
    }));
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.getByText('Equity LTCG after set-off').nextSibling).toHaveTextContent('+₹1,50,000');
    expect(screen.getByText('Taxable LTCG').nextSibling).toHaveTextContent('₹65,000');
  });

  it('summary null (not the current FY): realised figures only, no open-lot lines', async () => {
    respond(harvest({ summary: null, lots: [] }));
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(screen.getByText('Net long-term after set-off')).toBeInTheDocument();
    expect(screen.queryByText('LTCG you could book tax-free')).not.toBeInTheDocument();
    expect(screen.queryByText('Losses you could book')).not.toBeInTheDocument();
  });

  it('identical lots of one holding get distinct keys (no React key collision)', async () => {
    const twin = lot({ holdingId: 'h9', instrument: 'Twin', buyDate: '2025-01-01', quantity: 10 });
    expect(lotKeys([twin, twin, lot()])).toEqual(['h9:2025-01-01:10:0', 'h9:2025-01-01:10:1', 'h1:2024-01-10:100:0']);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    respond(harvest({ lots: [twin, twin] }));
    renderWithQuery(<TaxHarvestWidget />);
    const rows = within(await screen.findByRole('list', { name: 'Open lots' })).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(error.mock.calls.some((c) => String(c[0]).includes('same key'))).toBe(false);
    error.mockRestore();
  });
});
