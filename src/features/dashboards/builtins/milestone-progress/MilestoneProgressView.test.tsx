import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { kpi, NOW, rawTable, widget } from '@/features/dashboards/builtins/testFixtures';
import type { ReportData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { MilestoneProgressView } from './MilestoneProgressView';

const view = (data: ReportData, onPageChange = vi.fn()) => ({ widget: widget('milestone_progress'), data, onPageChange });

const COLS = ['card', 'milestone', 'windowStart', 'windowEnd', 'rewardType', 'threshold', 'progress', 'progressPct'];
const milestones = rawTable(COLS, [
  { id: 'm1', card: 'Atlas', cardId: 'c1', milestone: '₹3L quarterly', windowStart: '2026-10-01', windowEnd: '2026-10-19', rewardType: 'POINTS', threshold: 300000, progress: 162000, progressPct: 54 },
  { id: 'm2', card: 'Atlas', cardId: 'c1', milestone: '₹7.5L yearly', windowStart: '2026-04-01', windowEnd: '2027-03-31', rewardType: 'POINTS', threshold: 750000, progress: 162000, progressPct: 21.6 },
  { id: 'm3', card: 'Millennia', cardId: 'c2', milestone: 'Monthly 50k', windowStart: '2026-10-01', windowEnd: '2026-10-10', rewardType: 'CASH', threshold: 50000, progress: 10000, progressPct: 20 },
]);

describe('MilestoneProgressView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('a row per card: card · milestone, percent and a bar, linking to the card on Rewards', () => {
    renderWithQuery(<MilestoneProgressView {...view(milestones)} />);
    const rows = screen.getAllByTestId('milestone-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Atlas · ₹3L quarterly');
    expect(rows[0]).toHaveTextContent('54%');
    expect(within(rows[0]).getByRole('progressbar')).toBeInTheDocument();
    for (const row of rows) {
      expect(row).not.toHaveTextContent(/days? left|\/day|Pays|Reached| of ₹/);
    }
    expect(rows[0].closest('a') ?? within(rows[0]).getByRole('link')).toHaveAttribute('href', expect.stringMatching(/\/rewards\?account=c1$/));
  });

  it('transaction-count milestones and reached ones show the same card, name and percent only', () => {
    const t = rawTable([...COLS, 'basis', 'payoutValue'], [
      { id: 'c', card: 'C', cardId: 'c', milestone: '20 txns', windowEnd: '2026-10-19', rewardType: 'POINTS', basis: 'TXN_COUNT', threshold: 20, progress: 9, progressPct: 45, payoutValue: 5000 },
      { id: 'd', card: 'D', cardId: 'd', milestone: 'Spend', windowEnd: '2026-10-19', rewardType: 'CASH', threshold: 1000, progress: 1000, progressPct: 100, payoutValue: 250 },
    ]);
    renderWithQuery(<MilestoneProgressView {...view(t)} />);
    const [c, d] = screen.getAllByTestId('milestone-row');
    expect(c).toHaveTextContent('C · 20 txns');
    expect(c).toHaveTextContent('45%');
    expect(c).not.toHaveTextContent(/txn\/day|Pays|days left/);
    expect(d).toHaveTextContent('100%');
    expect(d).not.toHaveTextContent(/Reached|Pays/);
  });

  it('empty: no milestones in progress', () => {
    renderWithQuery(<MilestoneProgressView {...view(rawTable(COLS, []))} />);
    expect(screen.getByText('Add spend milestones to a card on the Rewards page to track them here.')).toBeInTheDocument();
  });

  it('pages only when the rows span several pages', async () => {
    const onPage = vi.fn();
    const { unmount } = renderWithQuery(<MilestoneProgressView {...view(milestones, onPage)} />);
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    unmount();
    renderWithQuery(<MilestoneProgressView {...view({ ...milestones, page: { number: 0, size: 50, totalElements: 60, totalPages: 2 } }, onPage)} />);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: /next/i }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<MilestoneProgressView {...view(kpi(1))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
