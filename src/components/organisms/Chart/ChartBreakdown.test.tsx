import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ChartData } from '@/lib/reports.types';

import { ChartBreakdown, type ChartBreakdownProps } from './ChartBreakdown';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const sub = (label: string, value: number, count: number) => ({ label, value, count });

/** Food 400 (2 sub-rows), Shopping 200, Other 100 folding 3 categories; total 700; previous 400, 250, 100. */
const data = (over: Partial<ChartData> = {}): ChartData => ({
  type: 'CHART',
  chartType: 'breakdown',
  dimension: 'category',
  categories: ['Food', 'Shopping', 'Other'],
  series: [{ name: 'Spend', data: [400, 200, 100] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 30, dateRange: null },
  other: { index: 2, foldedCount: 3 },
  breakdown: {
    rows: [
      { count: 20, avg: 20, previousCount: 18, subRows: [sub('Swiggy', 250, 12), sub('Zomato', 150, 8)] },
      { count: 6, avg: 33.4, previousCount: 5, subRows: [] },
      { count: 4, avg: 25, previousCount: 4, subRows: [] },
    ],
    total: 700,
    previousTotal: 750,
  },
  ...over,
});

const compared = (): ChartData =>
  data({ previous: { series: [{ name: 'Spend', data: [400, 250, 100] }], dateRange: null } });

const view = (props: Partial<ChartBreakdownProps> = {}, d: ChartData = data()) => render(<ChartBreakdown data={d} money {...props} />);
// The first header is the expand column's (blank). A value shows twice: in its cell and in the phone line; the cell comes first.
const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent).slice(1);
const cell = (text: string) => screen.getAllByText(text)[0];

describe('ChartBreakdown columns', () => {
  it('shows label, amount and share by default, with no change without a comparison', () => {
    view();
    expect(headers()).toEqual(['Category', 'Amount', 'Share']);
    expect(screen.getByText('₹400')).toBeInTheDocument();
    expect(cell('57%')).toBeInTheDocument();
  });

  it('adds the change column by default when the data compares', () => {
    view({}, compared());
    expect(headers()).toEqual(['Category', 'Amount', 'Share', 'vs prev']);
  });

  it('shows the chosen columns in the fixed order whatever order they are given', () => {
    view({ columns: ['avg', 'count', 'amount'] });
    expect(headers()).toEqual(['Category', 'Amount', 'Txns', 'Avg']);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('₹33')).toBeInTheDocument();
  });

  it('hides the share column when there is no total', () => {
    const d = data();
    d.breakdown = { ...d.breakdown!, total: null };
    view({ columns: ['amount', 'share'] }, d);
    expect(headers()).toEqual(['Category', 'Amount']);
    expect(screen.queryByText('Total', { exact: false })).not.toBeInTheDocument();
  });

  it('hides the share column when the total is zero, and bars fall back to the largest row', () => {
    const d = data();
    d.breakdown = { ...d.breakdown!, total: 0 };
    view({ columns: ['amount', 'share'], bars: 'share_of_total' }, d);
    expect(headers()).toEqual(['Category', 'Amount']);
    expect(screen.getAllByRole('progressbar').map((b) => Number(b.getAttribute('aria-valuenow')))).toEqual([100, 50, 25]);
  });

  it('labels the first column with the rows’ dimension', () => {
    view({ rowsLabel: 'Merchant' });
    expect(headers()[0]).toBe('Merchant');
  });

  it('shows the total in the footer', () => {
    view();
    expect(screen.getByText('Total ₹700')).toBeInTheDocument();
  });
});

describe('ChartBreakdown change, signs', () => {
  it('measures against the size of a negative previous value, so a rise reads as an increase', () => {
    const d = compared();
    d.previous!.series[0].data = [-400, 250, 100];
    view({ columns: ['amount', 'change'] }, d);
    // 400 against -400: +200%.
    expect(cell('+200%')).toBeInTheDocument();
  });

  it('shows a dash, not a percent, for a zero previous value', () => {
    const d = compared();
    d.previous!.series[0].data = [0, 250, 100];
    view({ columns: ['amount', 'change'] }, d);
    expect(cell('—')).toBeInTheDocument();
    expect(screen.queryByText('Infinity%')).not.toBeInTheDocument();
  });
});

describe('ChartBreakdown change', () => {
  it('prints a signed percent against the previous period, and a dash with no previous value', () => {
    const d = compared();
    d.previous!.series[0].data = [400, null, 100];
    view({ columns: ['amount', 'change'] }, d);
    expect(cell('0%')).toBeInTheDocument();
    expect(cell('—')).toBeInTheDocument();
  });

  it('reads an increase as bad when higher is not better, and a decrease as good', () => {
    const d = compared();
    d.previous!.series[0].data = [500, 150, 100];
    view({ higherIsBetter: false, columns: ['amount', 'change'] }, d);
    expect(cell('−20%').className).toMatch(/positive/);
    expect(cell('+33%').className).toMatch(/danger/);
  });

  it('reads an increase as good when higher is better', () => {
    const d = compared();
    d.previous!.series[0].data = [500, 150, 100];
    view({ higherIsBetter: true, columns: ['amount', 'change'] }, d);
    expect(cell('+33%').className).toMatch(/positive/);
    expect(cell('−20%').className).toMatch(/danger/);
  });

  it('keeps the change neutral with no preference and when it is zero', () => {
    const d = compared();
    d.previous!.series[0].data = [400, 150, 100];
    view({ columns: ['amount', 'change'] }, d);
    expect(cell('+33%').className).not.toMatch(/positive|danger/);
    view({ higherIsBetter: true, columns: ['amount', 'change'] }, d);
    expect(cell('0%').className).not.toMatch(/positive|danger/);
  });
});

describe('ChartBreakdown bars', () => {
  const fills = () => screen.getAllByRole('progressbar').map((b) => Number(b.getAttribute('aria-valuenow')));

  it('measures each bar against the largest row by default, leaving the Other row out of the largest', () => {
    view();
    expect(fills()).toEqual([100, 50, 25]);
  });

  it('falls back to the largest row for share of total when there is no total', () => {
    const d = data();
    d.breakdown = { ...d.breakdown!, total: null };
    view({ bars: 'share_of_total' }, d);
    expect(fills()).toEqual([100, 50, 25]);
  });

  it('measures each bar against the total for share of total', () => {
    view({ bars: 'share_of_total' });
    expect(fills().map(Math.round)).toEqual([57, 29, 14]);
  });
});

describe('ChartBreakdown bar colours', () => {
  const fillClasses = () => screen.getAllByRole('progressbar').map((b) => (b.firstElementChild as HTMLElement).className);

  it('draws each row in its own chart colour by rank, and the Other row in the rest colour', () => {
    view();
    const [food, shopping, other] = fillClasses();
    expect(food).toContain('bg-series-1');
    expect(shopping).toContain('bg-series-2');
    expect(other).toContain('bg-series-rest');
  });

  it('cycles chart-1 to chart-5 and starts again at the sixth row', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const d = data({
      categories: names,
      series: [{ name: 'Spend', data: [70, 60, 50, 40, 30, 20, 10] }],
      other: null,
      breakdown: { rows: names.map(() => ({ count: 1, avg: 1, previousCount: 1, subRows: [] })), total: 280, previousTotal: null },
    });
    view({}, d);
    expect(fillClasses().map((c) => /bg-series-(\d|rest)/.exec(c)?.[0])).toEqual([
      'bg-series-1',
      'bg-series-2',
      'bg-series-3',
      'bg-series-4',
      'bg-series-5',
      'bg-series-1',
      'bg-series-2',
    ]);
  });
});

describe('ChartBreakdown Other row', () => {
  it('reads "Other · N categories" with no rank, and is neither expandable nor pressable', async () => {
    const onOpen = vi.fn();
    view({ onOpenRow: onOpen });
    expect(screen.getByText('Other · 3 categories')).toBeInTheDocument();
    const row = screen.getByText('Other · 3 categories').closest('[role="button"], [role="row"]') as HTMLElement;
    expect(within(row).queryByText(/^\d+$/)).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Expand row' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Other · 3 categories'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not expand even when the server sends it sub-rows', async () => {
    const d = data();
    d.breakdown!.rows[2].subRows = [sub('Other thing', 100, 4)];
    view({}, d);
    await user.click(screen.getByText('Other · 3 categories'));
    expect(screen.queryByText('Other thing · 4 txns')).not.toBeInTheDocument();
  });

  it('has no rank column: the label column leads and takes the remaining width', () => {
    view();
    expect(headers()).not.toContain('#');
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    const grid = document.querySelector<HTMLElement>('[style*="--grid-template"]')!;
    expect(grid.style.getPropertyValue('--grid-template')).toMatch(/^var\(--ds-control-md\) minmax\(0, 1fr\) /);
  });
});

describe('ChartBreakdown sub-rows and presses', () => {
  it('expands a row with sub-rows on a press, showing each with its count and value, and opens nothing', async () => {
    const onOpen = vi.fn();
    view({ onOpenRow: onOpen });
    expect(screen.queryByText('Swiggy · 12 txns')).not.toBeInTheDocument();
    await user.click(screen.getByText('Food'));
    expect(screen.getByText('Swiggy · 12 txns')).toBeInTheDocument();
    expect(screen.getByText('Zomato · 8 txns')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByText('Tap a row to expand it')).toBeInTheDocument();
  });

  it('says "1 txn" for a single transaction', async () => {
    const d = data();
    d.breakdown!.rows[0].subRows = [sub('Swiggy', 250, 1)];
    view({}, d);
    await user.click(screen.getByText('Food'));
    expect(screen.getByText('Swiggy · 1 txn')).toBeInTheDocument();
  });

  it('opens underlying data from the link inside the expanded row', async () => {
    const onOpen = vi.fn();
    view({ onOpenRow: onOpen });
    await user.click(screen.getByText('Food'));
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(onOpen).toHaveBeenCalledWith(0);
  });

  it('maps sub-row labels through the sub-dimension’s value labels', async () => {
    const d = data({ subValueLabels: { Swiggy: 'Swiggy Instamart' } });
    view({}, d);
    await user.click(screen.getByText('Food'));
    expect(screen.getByText('Swiggy Instamart · 12 txns')).toBeInTheDocument();
  });

  it('opens underlying data directly on a press when the row has no sub-rows', async () => {
    const onOpen = vi.fn();
    view({ onOpenRow: onOpen });
    await user.click(screen.getByText('Shopping'));
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('makes a row non-pressable and hides the link when canOpenRow says no', async () => {
    const onOpen = vi.fn();
    view({ onOpenRow: onOpen, canOpenRow: (i) => i === 1 });
    await user.click(screen.getByText('Food'));
    expect(screen.getByText('Swiggy · 12 txns')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Underlying data' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Shopping'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    view({ onOpenRow: onOpen, canOpenRow: () => false });
    await user.click(screen.getAllByText('Shopping')[1]);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows no expand hint when no row has sub-rows', () => {
    const d = data();
    d.breakdown!.rows[0].subRows = [];
    view({}, d);
    expect(screen.queryByText('Tap a row to expand it')).not.toBeInTheDocument();
  });
});
