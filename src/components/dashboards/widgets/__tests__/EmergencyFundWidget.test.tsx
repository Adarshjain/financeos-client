import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: ({ onOpenChange, ...p }: { onOpenChange: (o: boolean) => void }) => (
    <div data-testid="kpi-dialog" data-props={JSON.stringify(p)}>
      <button onClick={() => onOpenChange(false)}>close dialog</button>
    </div>
  ),
}));

import {
  liquidBalanceRequest,
  monthBounds,
  monthOutflowRequest,
} from '@/components/dashboards/widgets/emergency_fund/emergencyFund.requests';
import {
  EmergencyFundWidget,
  formatMonthsCovered,
  monthName,
} from '@/components/dashboards/widgets/emergency_fund/EmergencyFundWidget';
import { api, ApiError } from '@/lib/api/client';
import type { EmergencyFund } from '@/lib/query/hooks/useEmergencyFund';
import { renderWithQuery } from '@/test/renderWithQuery';

import { dialogProps } from './cardsSpendingFixtures';

const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

function fund(over: Partial<EmergencyFund> = {}): EmergencyFund {
  return {
    liquidBalance: 315000,
    accounts: [
      { id: 'b1', name: 'HDFC', type: 'bank_account', balance: 300000 },
      { id: 'g1', name: 'Cash', type: 'generic', balance: 15000 },
    ],
    months: MONTHS.map((month, i) => ({ month, outflow: 60000 + i * 6000, beforeHistory: false })),
    historyMonths: 6,
    medianOutflow: 75000,
    monthsCovered: 4.2,
    band: 'medium',
    ...over,
  };
}

function serve(value: EmergencyFund | Error | null) {
  vi.mocked(api.GET).mockImplementation((() =>
    value === null ? new Promise(() => {}) : value instanceof Error ? Promise.reject(value) : Promise.resolve({ data: value })) as never);
}

describe('emergency fund helpers', () => {
  it('formats months covered and month names', () => {
    expect(formatMonthsCovered(4.2)).toBe('4.2 months');
    expect(formatMonthsCovered(1)).toBe('1 month');
    expect(formatMonthsCovered(6)).toBe('6 months');
    expect(monthName('2026-04')).toBe('Apr');
    expect(monthName('2026-04', true)).toBe('Apr 2026');
    expect(monthBounds('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthBounds('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('the drills: net worth bank + cash rows, and one month of outflow on those accounts', () => {
    expect(liquidBalanceRequest()).toEqual({
      type: 'KPI', datasource: 'net_worth',
      definition: { measure: 'signedValue', aggregation: 'sum', filters: [{ field: 'kind', operator: 'in', value: ['bank_account', 'generic'] }], comparison: { enabled: false } },
    });
    expect(monthOutflowRequest('2026-09', ['b1', 'g1']).definition).toEqual({
      measure: 'spend',
      aggregation: 'sum',
      filters: [
        { field: 'account', operator: 'in', value: ['b1', 'g1'] },
        { field: 'type', operator: 'is', value: 'DEBIT' },
        { field: 'isExcluded', operator: 'is', value: false },
        { field: 'linkType', operator: 'not_in', value: ['TRANSFER', 'REVERSAL'] },
        { field: 'date', operator: 'between', value: { from: '2026-09-01', to: '2026-09-30' } },
      ],
      comparison: { enabled: false },
    });
  });
});

describe('EmergencyFundWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('months covered in its band colour, the usual outflow, the balance and six month bars', async () => {
    serve(fund());
    renderWithQuery(<EmergencyFundWidget />);
    const months = await screen.findByTestId('emergency-months');
    expect(months).toHaveTextContent('4.2 months');
    expect(months).toHaveClass('text-amber-600');
    expect(screen.getByText('₹75,000')).toBeInTheDocument();
    expect(screen.queryByText(/based on/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /— view bank and cash balances$/ })).toHaveTextContent('₹3,15,000');
    expect(within(screen.getByTestId('emergency-month-bars')).getAllByRole('button')).toHaveLength(6);
    expect(api.GET).toHaveBeenCalledWith('/api/v1/insights/emergency-fund');
  });

  it('low is rose, high is emerald', async () => {
    serve(fund({ monthsCovered: 1.5, band: 'low' }));
    const { unmount } = renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByTestId('emergency-months')).toHaveClass('text-rose-600');
    unmount();
    serve(fund({ monthsCovered: 8, band: 'high' }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByTestId('emergency-months')).toHaveClass('text-emerald-600');
  });

  it('months before history are muted, not drillable, and the median notes how many months it used', async () => {
    serve(fund({
      historyMonths: 2,
      months: MONTHS.map((month, i) => ({ month, outflow: i >= 4 ? 70000 : 0, beforeHistory: i < 4 })),
    }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByText(/based on 2 months/)).toBeInTheDocument();
    const bars = screen.getByTestId('emergency-month-bars');
    expect(within(bars).getAllByRole('button')).toHaveLength(2);
    expect(within(bars).getByRole('img', { name: 'Apr 2026: no history' })).toHaveAttribute('data-before-history', 'true');
  });

  it('the balance and a month open their underlying data', async () => {
    serve(fund());
    renderWithQuery(<EmergencyFundWidget />);
    await userEvent.click(await screen.findByRole('button', { name: /— view bank and cash balances$/ }));
    expect(dialogProps(await screen.findByTestId('kpi-dialog'))).toEqual({
      source: { kind: 'adhoc', request: liquidBalanceRequest() }, title: 'Bank and cash', open: true,
    });
    await userEvent.click(screen.getByText('close dialog'));
    await userEvent.click(screen.getByRole('button', { name: 'Sep 2026: ₹90,000 outflow' }));
    expect(dialogProps(await screen.findByTestId('kpi-dialog'))).toEqual({
      source: { kind: 'adhoc', request: monthOutflowRequest('2026-09', ['b1', 'g1']) },
      title: 'Outflow · Sep 2026',
      open: true,
    });
  });

  it('no history yet: an explanation instead of the figure', async () => {
    serve(fund({
      historyMonths: 0, monthsCovered: null, band: null, medianOutflow: 0,
      months: MONTHS.map((month) => ({ month, outflow: 0, beforeHistory: true })),
    }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByText('Not enough history yet')).toBeInTheDocument();
    expect(screen.getByText(/full month of transactions/)).toBeInTheDocument();
    expect(screen.queryByTestId('emergency-months')).not.toBeInTheDocument();
  });

  it('history but no outflow, with nothing in the bank: says both', async () => {
    serve(fund({
      historyMonths: 3, monthsCovered: null, band: null, medianOutflow: 0, liquidBalance: 0,
      months: MONTHS.map((month, i) => ({ month, outflow: 0, beforeHistory: i < 3 })),
    }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByText('No outflow from your bank and cash accounts in the last 3 months.')).toBeInTheDocument();
    expect(screen.getByText(/nothing set aside yet/)).toBeInTheDocument();
  });

  it('history with some outflow but a ₹0 median: says most months had none (not that there was none)', async () => {
    serve(fund({
      historyMonths: 3, monthsCovered: null, band: null, medianOutflow: 0,
      months: MONTHS.map((month, i) => ({ month, outflow: i === 4 ? 5000 : 0, beforeHistory: i < 3 })),
    }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(
      await screen.findByText('Most of the last 3 months had no outflow from your bank and cash accounts, so the usual monthly outflow is ₹0.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/^No outflow from your bank/)).not.toBeInTheDocument();
  });

  it('outflow only before the history window still reads as no outflow', async () => {
    serve(fund({
      historyMonths: 3, monthsCovered: null, band: null, medianOutflow: 0,
      months: MONTHS.map((month, i) => ({ month, outflow: i === 0 ? 900 : 0, beforeHistory: i < 3 })),
    }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByText('No outflow from your bank and cash accounts in the last 3 months.')).toBeInTheDocument();
  });

  it('no liquid accounts: an empty state linking to accounts', async () => {
    serve(fund({ accounts: [], liquidBalance: 0, historyMonths: 0, monthsCovered: null, band: null }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByText('No bank or cash accounts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', '/accounts');
  });

  it('every open bank / cash account is excluded: says so (not "add one") and links to accounts', async () => {
    const empty = fund({ accounts: [], liquidBalance: 0, historyMonths: 0, monthsCovered: null, band: null });
    vi.mocked(api.GET).mockImplementation(((url: string) =>
      Promise.resolve({
        data: url === '/api/v1/accounts'
          ? [
              { id: 'b1', name: 'HDFC', type: 'bank_account', excludeFromNetAsset: true, closedOn: null },
              { id: 'b2', name: 'Old', type: 'bank_account', excludeFromNetAsset: false, closedOn: '2020-01-01' },
              { id: 'c1', name: 'Card', type: 'credit_card', excludeFromNetAsset: false, closedOn: null },
            ]
          : empty,
      })) as never);
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByText('Your bank and cash accounts are excluded')).toBeInTheDocument();
    expect(screen.getByText(/Include one to see how long your money would last/)).toBeInTheDocument();
    expect(screen.queryByText('No bank or cash accounts')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', '/accounts');
  });

  it('the drill requests carry exactly the filters the server sums (liquid = net worth bank + wallet rows; outflow per month)', () => {
    // Server: EmergencyFundService — liquid accounts are net worth's kind in (bank_account, generic) rows;
    // outflow = transactions.spend over account in <liquid ids>, type DEBIT, isExcluded false,
    // linkType not_in (TRANSFER, REVERSAL) (NULL passes), date between the month's first and last day.
    const filters = monthOutflowRequest('2024-02', ['b1']).definition as { filters: Array<{ field: string; operator: string; value?: unknown }> };
    expect(filters.filters.map((f) => [f.field, f.operator])).toEqual([
      ['account', 'in'], ['type', 'is'], ['isExcluded', 'is'], ['linkType', 'not_in'], ['date', 'between'],
    ]);
    expect(filters.filters[4].value).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthBounds('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(liquidBalanceRequest().datasource).toBe('net_worth');
  });

  it('loading skeleton and error', async () => {
    serve(null);
    const { unmount } = renderWithQuery(<EmergencyFundWidget />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    unmount();
    serve(new ApiError(500, { code: 'X', message: 'Server down' }));
    renderWithQuery(<EmergencyFundWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
  });
});
