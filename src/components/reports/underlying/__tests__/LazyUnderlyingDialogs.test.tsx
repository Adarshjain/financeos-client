import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each dialog module records when it is evaluated (= its code was loaded).
const loads = vi.hoisted(() => ({ kpi: 0, row: 0, txn: 0 }));

vi.mock('../KpiUnderlyingDialog', () => {
  loads.kpi += 1;
  return { KpiUnderlyingDialog: (p: { title: string }) => <div data-testid="kpi-dialog">{p.title}</div> };
});
vi.mock('../RowBreakdownDialog', () => {
  loads.row += 1;
  return { RowBreakdownDialog: (p: { rowId: string }) => <div data-testid="breakdown-dialog">{p.rowId}</div> };
});
vi.mock('../UnderlyingTransactionDialog', () => {
  loads.txn += 1;
  return {
    UnderlyingTransactionDialog: ({ transactionId }: { transactionId: string | null }) => (
      <div data-testid="txn-dialog" data-open={String(transactionId !== null)}>
        {transactionId}
      </div>
    ),
  };
});
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { TaxHarvestWidget } from '@/components/dashboards/widgets/tax_harvest/TaxHarvestWidget';
import { api } from '@/lib/api/client';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LazyUnderlyingTransactionDialog } from '../LazyUnderlyingTransactionDialog';

const harvest: TaxHarvestResponse = {
  fy: 2026,
  fyStart: '2026-04-01',
  fyEnd: '2027-03-31',
  realised: {
    stcg: 0, stcl: 0, ltcg: 0, ltcl: 0, netStcg: 0, netLtcg: 0, netEquityLtcg: 0,
    stclCarriedForward: 0, ltclCarriedForward: 0, slabGains: 0,
    otherGains: { shortTerm: 0, longTerm: 0, total: 0 },
    exemptionLimit: 125000, exemptionUsed: 0, exemptionLeft: 125000, taxableLtcg: 0,
  },
  summary: undefined,
  openLots: {
    items: [{
      holdingId: 'h1', instrumentId: 'i1', instrument: 'Nifty ETF', broker: 'Z', assetClass: 'EQUITY',
      taxClass: 'EQUITY_ORIENTED', buyDate: '2024-01-10', quantity: 1, costPerUnit: 1, cost: 1, price: 2,
      value: 2, gain: 1, term: 'long', longTermOn: '2025-01-11', daysToLongTerm: 0, grandfathered: false,
    }],
    page: 0, size: 5, totalElements: 1, totalPages: 1,
  },
};

describe('lazy underlying dialogs', () => {
  beforeEach(() => {
    vi.mocked(api.GET).mockResolvedValue({ data: harvest } as never);
  });

  it('a widget loads neither dialog module until a tap, then only the one tapped', async () => {
    renderWithQuery(<TaxHarvestWidget />);
    await screen.findByTestId('ltcg-exemption');
    expect(loads).toMatchObject({ kpi: 0, row: 0, txn: 0 });

    await userEvent.click(screen.getByRole('button', { name: /view underlying data for Long-term P&L/ }));
    expect(await screen.findByTestId('kpi-dialog')).toHaveTextContent('Equity long-term P&L this FY');
    expect(loads).toMatchObject({ kpi: 1, row: 0 });

    await userEvent.click(screen.getByRole('button', { name: /Nifty ETF/ }));
    expect(await screen.findByTestId('breakdown-dialog')).toHaveTextContent('h1');
    expect(loads).toMatchObject({ kpi: 1, row: 1, txn: 0 });
  });

  it('the transaction detail loads on the first opened transaction and then stays mounted to animate out', async () => {
    const onClose = vi.fn();
    const { rerender, container } = render(<LazyUnderlyingTransactionDialog transactionId={null} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();
    expect(loads.txn).toBe(0);

    rerender(<LazyUnderlyingTransactionDialog transactionId="t1" onClose={onClose} />);
    expect(await screen.findByTestId('txn-dialog')).toHaveTextContent('t1');
    expect(loads.txn).toBe(1);

    rerender(<LazyUnderlyingTransactionDialog transactionId={null} onClose={onClose} />);
    expect(screen.getByTestId('txn-dialog')).toHaveAttribute('data-open', 'false');
  });
});
