// The investments & loans group as the registry sees it: bodies (with their
// params), the allocation view, the loan subtitle, phone slots and the
// shortcuts params editor; plus the allocation template end-to-end through
// DashboardWidgetView.

import { render, screen } from '@testing-library/react';
import { isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../../widgets/portfolio_snapshot/PortfolioSnapshotWidget', () => ({
  PortfolioSnapshotWidget: () => <div data-testid="body" data-which="portfolio" />,
}));
vi.mock('../../widgets/top_movers/TopMoversWidget', () => ({
  TopMoversWidget: ({ n }: { n: number }) => <div data-testid="body" data-which="movers" data-n={n} />,
}));
vi.mock('../../widgets/tax_harvest/TaxHarvestWidget', () => ({
  TaxHarvestWidget: () => <div data-testid="body" data-which="tax" />,
}));
vi.mock('../../widgets/lending_balances/LendingBalancesWidget', () => ({
  LendingBalancesWidget: () => <div data-testid="body" data-which="lending" />,
}));
vi.mock('../../widgets/shortcuts/ShortcutsWidget', () => ({
  ShortcutsWidget: ({ ids }: { ids: string[] }) => <div data-testid="body" data-which="shortcuts" data-ids={ids.join(',')} />,
}));
vi.mock('../../widgets/loan_payoff/LoanPayoffWidget', () => ({
  LoanPayoffWidget: ({ loanId }: { loanId: string | null }) => <div data-testid="body" data-which="loan" data-loan={loanId ?? 'all'} />,
  LoanNameSubtitle: ({ loanId }: { loanId: string }) => <p>{`loan ${loanId}`}</p>,
}));

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { hasEditableParams } from '@/components/dashboards/params/paramsModel';
import { DEFAULT_SHORTCUTS } from '@/components/shortcuts/catalog';
import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { phoneSlot } from '../../widgetMeta';
import { AllocationView } from '../../widgets/allocation/AllocationView';
import { ShortcutsParamsEditor } from '../../widgets/shortcuts/ShortcutsParamsEditor';
import { INVESTMENTS_LOANS_ENTRIES, INVESTMENTS_LOANS_VIEWS } from '../group.investmentsLoans';
import { builtinEntry, builtinParamsEditor, templateView } from '../registry';

const L = { x: 0, y: 0, w: 50, h: 24 };
const widget = (key: string, params: Record<string, unknown> = {}, kind: 'component' | 'template' = 'component'): WidgetResponse => ({
  id: `w-${key}`, kind: 'builtin', reportId: null, builtinKey: key, params, title: null, layout: L,
  builtin: { category: 'investments', key, label: key, minW: 50, kind, templateType: kind === 'template' ? 'CHART' : null, view: kind === 'template' ? key : null },
});

function renderBody(key: string, params: Record<string, unknown> = {}) {
  const Body = builtinEntry(key)!.Body!;
  render(<Body widget={widget(key, params)} params={params} />);
  return screen.getByTestId('body');
}

describe('investments & loans group', () => {
  it('registers a body for every component built-in of the group, and the allocation view', () => {
    expect(Object.keys(INVESTMENTS_LOANS_ENTRIES).sort()).toEqual(
      ['allocation', 'lending_balances', 'loan_payoff', 'portfolio_snapshot', 'shortcuts', 'tax_harvest', 'top_movers'],
    );
    for (const key of ['portfolio_snapshot', 'top_movers', 'tax_harvest', 'loan_payoff', 'lending_balances', 'shortcuts']) {
      expect(builtinEntry(key)?.Body, key).toBeDefined();
      expect(builtinEntry(key)?.icon, key).toBeDefined();
    }
    expect(builtinEntry('allocation')?.Body).toBeUndefined();
    expect(INVESTMENTS_LOANS_VIEWS).toEqual({ allocation: AllocationView });
    expect(templateView('allocation')).toBe(AllocationView);
  });

  it('top_movers gets n from its params', () => {
    expect(renderBody('top_movers', { n: 7 })).toHaveAttribute('data-n', '7');
  });
  it('top_movers defaults n to 5', () => {
    expect(renderBody('top_movers')).toHaveAttribute('data-n', '5');
  });
  it('loan_payoff passes the picked loan, or all', () => {
    expect(renderBody('loan_payoff', { loanId: 'l9' })).toHaveAttribute('data-loan', 'l9');
  });
  it('loan_payoff without a loan shows all', () => {
    expect(renderBody('loan_payoff')).toHaveAttribute('data-loan', 'all');
  });
  it('shortcuts passes the stored items', () => {
    expect(renderBody('shortcuts', { items: ['page:/upcoming'] })).toHaveAttribute('data-ids', 'page:/upcoming');
  });
  it('shortcuts falls back to the defaults', () => {
    expect(renderBody('shortcuts')).toHaveAttribute('data-ids', DEFAULT_SHORTCUTS.join(','));
  });
  it.each(['portfolio_snapshot', 'tax_harvest', 'lending_balances'])('%s renders its widget', (key) => {
    expect(renderBody(key)).toBeInTheDocument();
  });

  it('loan_payoff subtitle: the loan name element when picked, else "All loans"', () => {
    const subtitle = builtinEntry('loan_payoff')!.subtitle!;
    expect(subtitle(widget('loan_payoff'))).toBe('All loans');
    const el = subtitle(widget('loan_payoff', { loanId: 'l9' }));
    expect(isValidElement(el)).toBe(true);
    render(<>{el}</>);
    expect(screen.getByText('loan l9')).toBeInTheDocument();
  });

  it('phone: component bodies size to content; allocation gets a short fixed slot', () => {
    for (const key of ['portfolio_snapshot', 'top_movers', 'tax_harvest', 'loan_payoff', 'lending_balances', 'shortcuts']) {
      expect(phoneSlot(widget(key))).toEqual({ fit: 'content' });
    }
    expect(phoneSlot(widget('allocation', {}, 'template'))).toEqual({ fit: 'fill', className: 'h-56' });
  });

  it('shortcuts has its own params editor, which makes its string_list editable', () => {
    expect(builtinParamsEditor('shortcuts')).toBe(ShortcutsParamsEditor);
    const def = {
      key: 'shortcuts', label: 'Shortcuts', description: '', kind: 'component', minW: 25, category: 'shortcuts',
      params: [{ name: 'items', type: 'string_list', required: false, maxItems: 12 }],
    } as BuiltinWidgetResponse;
    expect(hasEditableParams(def)).toBe(true);
  });
});

describe('allocation template through DashboardWidgetView', () => {
  beforeEach(() => vi.resetAllMocks());

  it('runs the built-in data endpoint and renders the CHART data with the allocation view', async () => {
    const data: ChartData = {
      type: 'CHART', chartType: 'donut', dimension: 'assetClass',
      categories: ['EQUITY', 'DEBT'], series: [{ name: 'currentValue', data: [300, 100] }],
      measure: { field: 'currentValue', aggregation: 'sum' },
      meta: { rowCount: 2 } as ChartData['meta'],
      valueLabels: { EQUITY: 'Equity', DEBT: 'Debt' },
    };
    vi.mocked(api.POST).mockResolvedValue({ data } as never);
    renderWithQuery(<DashboardWidgetView widget={widget('allocation', {}, 'template')} />);
    expect(await screen.findByTestId('allocation-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Equity.*— view underlying data$/ })).toHaveTextContent('75%');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/data', expect.objectContaining({
      params: expect.objectContaining({ path: { key: 'allocation' } }),
    }));
  });
});
