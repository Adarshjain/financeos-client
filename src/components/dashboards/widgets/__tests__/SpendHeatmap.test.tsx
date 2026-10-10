import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: ({ onOpenChange, ...p }: { onOpenChange: (o: boolean) => void }) => (
    <div data-testid="kpi-dialog" data-props={JSON.stringify(p)}>
      <button onClick={() => onOpenChange(false)}>close dialog</button>
    </div>
  ),
}));

import {
  buildHeatmap,
  levelOf,
  parseDayLabel,
  quartiles,
  spendByDay,
  windowStart,
} from '@/components/dashboards/widgets/spend_heatmap/heatmap.model';
import {
  daySpendRequest,
  fitGrid,
  heatmapMonths,
  SpendHeatmapView,
  visibleMonthLabels,
} from '@/components/dashboards/widgets/spend_heatmap/SpendHeatmapView';
import { renderWithQuery } from '@/test/renderWithQuery';

import { dayChart, dialogProps, noop, NOW, rawTable, TODAY, widget } from './cardsSpendingFixtures';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('heatmap model', () => {
  it('parses the server day buckets ("09 Oct 26") and ISO dates', () => {
    expect(parseDayLabel('09 Oct 26')).toBe('2026-10-09');
    expect(parseDayLabel('1 Jan 2027')).toBe('2027-01-01');
    expect(parseDayLabel('2026-10-09')).toBe('2026-10-09');
    expect(parseDayLabel('W41 26')).toBeNull();
    expect(parseDayLabel('09 Foo 26')).toBeNull();
  });

  it('sums spend per day from the first series, ignoring unreadable buckets and nulls', () => {
    const chart = dayChart([['09 Oct 26', 100], ['bad', 50], ['10 Oct 26', 0]], null);
    chart.series[0].data.push(null);
    chart.categories.push('08 Oct 26');
    expect([...spendByDay(chart)]).toEqual([['2026-10-09', 100], ['2026-10-10', 0]]);
  });

  it('levels: 0 for no spend, 1–4 by quartile of spending days', () => {
    const cuts = quartiles([0, 10, 20, 30, 40, 50]);
    expect(cuts).toEqual([20, 30, 40]);
    expect(levelOf(0, cuts)).toBe(0);
    expect(levelOf(10, cuts)).toBe(1);
    expect(levelOf(25, cuts)).toBe(2);
    expect(levelOf(35, cuts)).toBe(3);
    expect(levelOf(50, cuts)).toBe(4);
    expect(quartiles([])).toEqual([0, 0, 0]);
  });

  it('the rolling window starts the day after today minus N months (clamped to month end)', () => {
    expect(windowStart(TODAY, 6)).toBe('2026-04-11');
    expect(windowStart('2026-03-31', 1)).toBe('2026-03-01');
  });

  it('Monday-first weeks from the window start to today; outside days empty; today flagged', () => {
    // 2026-10-01 is a Thursday; today (2026-10-10) a Saturday.
    const m = buildHeatmap(dayChart([['01 Oct 26', 500], ['10 Oct 26', 100]], { from: '2026-10-01', to: '2026-10-31' }), TODAY, 6);
    expect(m.weeks.map((w) => w.start)).toEqual(['2026-09-28', '2026-10-05']);
    expect(m.weeks[0].days.slice(0, 3)).toEqual([null, null, null]);
    expect(m.weeks[0].days[3]).toMatchObject({ date: '2026-10-01', amount: 500, level: 4 });
    expect(m.weeks[1].days[5]).toMatchObject({ date: '2026-10-10', isToday: true });
    // Sunday after today is in the future: empty.
    expect(m.weeks[1].days[6]).toBeNull();
    expect(m.weeks[0].monthLabel).toBe('Oct');
    expect(m.spendDays).toBe(2);
  });

  it('without a resolved range it uses months back from today', () => {
    const m = buildHeatmap(dayChart([['10 Oct 26', 1]], null), TODAY, 1);
    expect(m.weeks[0].days.find(Boolean)?.date).toBe('2026-09-11');
  });
});

describe('heatmap layout helpers', () => {
  it('an unmeasured box shows every week at the default size', () => {
    expect(fitGrid(0, 0, 27)).toEqual({ cell: 12, shown: 27 });
  });

  it('cells grow to fill a wide box up to the max size', () => {
    expect(fitGrid(1200, 400, 27)).toEqual({ cell: 18, shown: 27 });
  });

  it('a narrow box keeps the min size and shows the latest weeks that fit', () => {
    const { cell, shown } = fitGrid(200, 300, 27);
    expect(cell).toBe(9);
    expect(shown).toBe(Math.floor((200 - 26 + 3) / 12));
  });

  it('a short box shrinks the cells to fit seven rows', () => {
    expect(fitGrid(1200, 48 + 7 * 13 - 3, 10).cell).toBe(10);
  });

  it('month labels never crowd: the first column only names its month when none starts within two columns', () => {
    // From Thu 20 Aug: columns start 17 Aug, 24 Aug, 31 Aug (September begins in the third).
    const m = buildHeatmap(dayChart([['10 Oct 26', 1]], { from: '2026-08-20', to: TODAY }), TODAY, 2);
    const labels = visibleMonthLabels(m.weeks);
    expect(labels[0]).toBeNull();
    expect(labels.filter(Boolean)).toEqual(['Sep', 'Oct']);
    // From 10 Aug September is three columns away, so the first column names August.
    const early = buildHeatmap(dayChart([['10 Oct 26', 1]], { from: '2026-08-10', to: TODAY }), TODAY, 2);
    expect(visibleMonthLabels(early.weeks).filter(Boolean)).toEqual(['Aug', 'Sep', 'Oct']);
  });

  it('months param: 1–12, default 6', () => {
    expect(heatmapMonths({})).toBe(6);
    expect(heatmapMonths({ months: 3 })).toBe(3);
    expect(heatmapMonths({ months: 40 })).toBe(12);
    expect(heatmapMonths({ months: 'x' })).toBe(6);
  });

  it('a day drills into its debits, not excluded, not a transfer leg', () => {
    expect(daySpendRequest('2026-10-09')).toEqual({
      type: 'KPI',
      datasource: 'transactions',
      definition: {
        measure: 'spend',
        aggregation: 'sum',
        filters: [
          { field: 'type', operator: 'is', value: 'DEBIT' },
          { field: 'isExcluded', operator: 'is', value: false },
          { field: 'isTransferLeg', operator: 'is', value: false },
          { field: 'date', operator: 'is', value: '2026-10-09' },
        ],
        comparison: { enabled: false },
      },
    });
  });
});

describe('SpendHeatmapView', () => {
  const props = (data = dayChart([['09 Oct 26', 1200], ['10 Oct 26', 300]], { from: '2026-09-11', to: TODAY })) => ({
    widget: widget('spend_heatmap', { months: 1 }),
    data,
    onPageChange: noop,
    onSizeChange: noop,
  });

  it('draws the calendar with labelled cells, the legend and today outlined', () => {
    renderWithQuery(<SpendHeatmapView {...props()} />);
    expect(screen.getByTestId('heatmap-grid')).toHaveAttribute('data-weeks', '5');
    expect(screen.getByRole('button', { name: '09/10/2026: ₹1,200.00' })).toHaveAttribute('data-level', '4');
    const today = screen.getByRole('button', { name: '10/10/2026: ₹300.00' });
    expect(today).toHaveClass('ring-1');
    expect(screen.getByRole('img', { name: '08/10/2026: no spend' })).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-legend')).toHaveTextContent('LessMore');
  });

  it('tapping a day opens its transactions', async () => {
    renderWithQuery(<SpendHeatmapView {...props()} />);
    await userEvent.click(screen.getByRole('button', { name: '09/10/2026: ₹1,200.00' }));
    expect(dialogProps(await screen.findByTestId('kpi-dialog'))).toEqual({
      source: { kind: 'adhoc', request: daySpendRequest('2026-10-09') },
      title: 'Spending on 09/10/2026',
      open: true,
    });
    await userEvent.click(screen.getByText('close dialog'));
    expect(screen.queryByTestId('kpi-dialog')).not.toBeInTheDocument();
  });

  it('empty when nothing was spent; other shapes are not drawn', () => {
    const { unmount } = renderWithQuery(<SpendHeatmapView {...props(dayChart([['09 Oct 26', 0]], null))} />);
    expect(screen.getByText('No spending in this period')).toBeInTheDocument();
    unmount();
    renderWithQuery(<SpendHeatmapView {...props()} data={rawTable([], [])} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
