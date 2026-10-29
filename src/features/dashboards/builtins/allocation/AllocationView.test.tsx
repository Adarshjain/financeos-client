import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const chartProps = vi.hoisted(() => ({ last: null as unknown }));
vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: (p: { data: unknown; money?: boolean }) => {
    chartProps.last = p;
    return <div data-testid="chart" />;
  },
}));

vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportUnderlyingDialog: (p: { request: unknown; title?: string; onClose: () => void }) => (
    <button type="button" data-testid="underlying" data-request={JSON.stringify(p.request)} data-title={p.title} onClick={p.onClose} />
  ),
}));

import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, KpiData } from '@/lib/reports.types';

import { positionsValueRequest } from '../investmentsLoansData';
import { allocationDonut, NO_CLASS, sliceFilter, sliceKeyOf } from './allocationData';
import { AllocationView } from './AllocationView';

const LABELS = { EQUITY: 'Equity', DEBT: 'Debt', HYBRID: 'Hybrid', GOLD: 'Gold' };
const chart = (pairs: Array<[string, number | null]>, labels: Record<string, string> | null = LABELS): ChartData => ({
  type: 'CHART',
  chartType: 'pie',
  dimension: 'assetClass',
  categories: pairs.map(([k]) => k),
  series: [{ name: 'currentValue', data: pairs.map(([, v]) => v) }],
  measure: { field: 'currentValue', aggregation: 'sum' },
  meta: { rowCount: pairs.length } as ChartData['meta'],
  valueLabels: labels,
});

const view = (data: ChartData | KpiData) => (
  <AllocationView widget={{} as WidgetResponse} data={data} onPageChange={() => {}} onSizeChange={() => {}} />
);

describe('allocationDonut', () => {
  it('positive buckets only, largest first, named by their label, drawn as a donut', () => {
    const donut = allocationDonut(chart([['DEBT', 25], ['EQUITY', 75], ['GOLD', 0], ['HYBRID', null]]))!;
    expect(donut.chartType).toBe('donut');
    expect(donut.categories).toEqual(['Equity', 'Debt']);
    expect(donut.series[0].data).toEqual([75, 25]);
  });

  it('the null bucket reads Unclassified; an unknown key keeps its raw name', () => {
    expect(allocationDonut(chart([[NO_CLASS, 10], ['CRYPTO', 5]], null))!.categories).toEqual(['Unclassified', 'CRYPTO']);
  });

  it('nothing positive is null', () => {
    expect(allocationDonut(chart([['EQUITY', 0]]))).toBeNull();
    expect(allocationDonut({ ...chart([]), series: [] })).toBeNull();
  });
});

describe('AllocationView', () => {
  it('draws the donut with the Chart organism, values as money', async () => {
    render(view(chart([['EQUITY', 75], ['DEBT', 25]])));
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
    expect(chartProps.last).toMatchObject({ money: true, data: { chartType: 'donut', categories: ['Equity', 'Debt'] } });
  });

  it('a slice press opens that class\'s holdings, titled with the class and its value', () => {
    render(view(chart([['EQUITY', 75], ['DEBT', 25]])));
    const press = (chartProps.last as { onSelectEntry: (e: { key: string; label: string; value: number }) => void }).onSelectEntry;
    act(() => press({ key: 'Debt', label: 'Debt', value: 25 }));
    const dialog = screen.getByTestId('underlying');
    expect(JSON.parse(dialog.getAttribute('data-request') as string)).toEqual(positionsValueRequest([sliceFilter('DEBT')]));
    expect(dialog).toHaveAttribute('data-title', 'Debt holdings · ₹25');
    act(() => dialog.click());
    expect(screen.queryByTestId('underlying')).not.toBeInTheDocument();
  });

  it('a slice with no class behind it (the folded Other) opens nothing', () => {
    render(view(chart([['EQUITY', 75], ['DEBT', 25]])));
    const press = (chartProps.last as { onSelectEntry: (e: { key: string; label: string; value: number }) => void }).onSelectEntry;
    act(() => press({ key: 'Other', label: 'Other', value: 5 }));
    expect(screen.queryByTestId('underlying')).not.toBeInTheDocument();
  });

  it('nothing to split, or data that is not a chart, says so', () => {
    const { unmount } = render(view(chart([['EQUITY', 0]])));
    expect(screen.getByText('No open holdings to split yet')).toBeInTheDocument();
    unmount();
    render(view({ type: 'KPI' } as KpiData));
    expect(screen.getByText('No open holdings to split yet')).toBeInTheDocument();
  });
});

describe('sliceKeyOf and sliceFilter', () => {
  it('maps a slice label back to its stored class, Unclassified to the none bucket', () => {
    const data = chart([['EQUITY', 75], [NO_CLASS, 25]]);
    expect(sliceKeyOf(data, 'Equity')).toBe('EQUITY');
    expect(sliceKeyOf(data, 'Unclassified')).toBe(NO_CLASS);
    expect(sliceKeyOf(data, 'Other')).toBeNull();
  });

  it('a known class filters to itself; anything else to every holding outside the known classes', () => {
    expect(sliceFilter('GOLD')).toEqual({ field: 'assetClass', operator: 'is', value: 'GOLD' });
    expect(sliceFilter(NO_CLASS)).toMatchObject({ field: 'assetClass', operator: 'not_in' });
  });
});
