import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: (p: { source: unknown; title: string }) => (
    <div data-testid="kpi-dialog" data-title={p.title} data-source={JSON.stringify(p.source)} />
  ),
}));

import { seriesColor } from '@/components/charts/chart-format';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, KpiData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { positionsValueRequest } from '../../investmentsLoansKit/kit';
import { allocationSlices, ASSET_CLASSES, formatShare, NO_CLASS, sliceFilter } from '../allocation';
import { AllocationView } from '../AllocationView';

const LABELS = { EQUITY: 'Equity', DEBT: 'Debt', HYBRID: 'Hybrid', GOLD: 'Gold', INTERNATIONAL: 'International', OTHER: 'Other' };

/** The allocation template's CHART data: stored categories + valueLabels, one series. */
const chart = (pairs: Array<[string, number | null]>): ChartData => ({
  type: 'CHART',
  chartType: 'donut',
  dimension: 'assetClass',
  categories: pairs.map(([k]) => k),
  series: [{ name: 'currentValue', data: pairs.map(([, v]) => v) }],
  measure: { field: 'currentValue', aggregation: 'sum' },
  meta: { rowCount: pairs.length } as ChartData['meta'],
  valueLabels: LABELS,
});

describe('allocationSlices', () => {
  it('positive buckets, largest first, labelled, with shares and palette colours by rank', () => {
    const slices = allocationSlices(chart([['DEBT', 25], ['EQUITY', 75], ['GOLD', 0], ['HYBRID', null], ['OTHER', -3]]));
    expect(slices).toEqual([
      { key: 'EQUITY', label: 'Equity', value: 75, share: 0.75, color: seriesColor(0) },
      { key: 'DEBT', label: 'Debt', value: 25, share: 0.25, color: seriesColor(1) },
    ]);
  });

  it('the null bucket reads Unclassified; an unknown key keeps its raw name', () => {
    const slices = allocationSlices({ ...chart([[NO_CLASS, 10], ['CRYPTO', 5]]), valueLabels: null });
    expect(slices.map((s) => s.label)).toEqual(['Unclassified', 'CRYPTO']);
  });

  it('nothing positive → no slices', () => {
    expect(allocationSlices(chart([['EQUITY', 0]]))).toEqual([]);
    expect(allocationSlices({ ...chart([]), series: [] })).toEqual([]);
  });

  it('sliceFilter: a known class is `is`; anything else is every holding outside the known classes', () => {
    expect(sliceFilter('GOLD')).toEqual({ field: 'assetClass', operator: 'is', value: 'GOLD' });
    expect(sliceFilter(NO_CLASS)).toEqual({ field: 'assetClass', operator: 'not_in', value: [...ASSET_CLASSES] });
  });

  it('formatShare rounds, with <1% for slivers', () => {
    expect(formatShare(0.644)).toBe('64%');
    expect(formatShare(0.004)).toBe('<1%');
    expect(formatShare(0)).toBe('0%');
  });
});

const widget = { id: 'w', kind: 'builtin', builtinKey: 'allocation' } as WidgetResponse;
const view = (data: ChartData | KpiData) =>
  renderWithQuery(<AllocationView widget={widget} data={data} onPageChange={vi.fn()} onSizeChange={vi.fn()} />);

describe('AllocationView', () => {
  it('renders the donut and a legend row per class with share and ₹', () => {
    view(chart([['EQUITY', 640000], ['DEBT', 210000], ['GOLD', 150000]]));
    expect(screen.getByTestId('allocation-donut')).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: 'Allocation by asset class' })).getAllByRole('button');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Equity');
    expect(rows[0]).toHaveTextContent('64%');
    expect(rows[0]).toHaveTextContent('₹6,40,000');
    expect(rows[2]).toHaveTextContent('Gold');
    expect(screen.getByText('₹10L')).toBeInTheDocument();
  });

  it('a legend row opens that class\'s open holdings (ad-hoc KPI over positions)', async () => {
    view(chart([['EQUITY', 100], ['DEBT', 50]]));
    await userEvent.click(screen.getByRole('button', { name: /^Debt.*— view underlying data$/ }));
    const dialog = await screen.findByTestId('kpi-dialog');
    expect(dialog).toHaveAttribute('data-title', 'Debt holdings');
    expect(JSON.parse(dialog.getAttribute('data-source')!)).toEqual({
      kind: 'adhoc',
      request: positionsValueRequest([{ field: 'assetClass', operator: 'is', value: 'DEBT' }]),
    });
  });

  it('the Unclassified row drills with not_in the known classes', async () => {
    view(chart([[NO_CLASS, 100]]));
    await userEvent.click(screen.getByRole('button', { name: /^Unclassified.*— view underlying data$/ }));
    const source = JSON.parse((await screen.findByTestId('kpi-dialog')).getAttribute('data-source')!);
    expect(source.request.definition.filters[1]).toEqual(sliceFilter(NO_CLASS));
  });

  it('empty when there is nothing positive (or the data is not a chart)', () => {
    const { unmount } = view(chart([['EQUITY', 0]]));
    expect(screen.getByText('No open holdings to split yet')).toBeInTheDocument();
    unmount();
    view({ type: 'KPI', value: 1 } as KpiData);
    expect(screen.getByText('No open holdings to split yet')).toBeInTheDocument();
  });
});
