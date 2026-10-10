import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: ({ onOpenChange, ...p }: { onOpenChange: (o: boolean) => void }) => (
    <div data-testid="kpi-dialog" data-props={JSON.stringify(p)}>
      <button onClick={() => onOpenChange(false)}>close dialog</button>
    </div>
  ),
}));

import { capTone } from '@/components/dashboards/widgets/cap_headroom/capHeadroom.model';
import { CapHeadroomView } from '@/components/dashboards/widgets/cap_headroom/CapHeadroomView';
import { nearestPerCard } from '@/components/dashboards/widgets/milestone_progress/milestoneProgress.model';
import { MilestoneProgressView } from '@/components/dashboards/widgets/milestone_progress/MilestoneProgressView';
import { buildRewardsEarned } from '@/components/dashboards/widgets/rewards_earned/rewardsEarned.model';
import { nativeText, RewardsEarnedView,rewardsRequest } from '@/components/dashboards/widgets/rewards_earned/RewardsEarnedView';
import type { ReportData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { dialogProps, noop, NOW, pivot, rawTable, TODAY, widget } from './cardsSpendingFixtures';

const view = (data: ReportData, onPageChange = noop) => ({
  widget: widget('x'),
  data,
  onPageChange,
  onSizeChange: noop,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------- milestone_progress

const M_COLS = ['card', 'milestone', 'windowStart', 'windowEnd', 'rewardType', 'threshold', 'progress', 'progressPct'];
const milestones = rawTable(M_COLS, [
  { id: 'm1', card: 'Atlas', cardId: 'c1', milestone: '₹3L quarterly', windowStart: '2026-10-01', windowEnd: '2026-10-19', rewardType: 'POINTS', threshold: 300000, progress: 162000, progressPct: 54 },
  { id: 'm2', card: 'Atlas', cardId: 'c1', milestone: '₹7.5L yearly', windowStart: '2026-04-01', windowEnd: '2027-03-31', rewardType: 'POINTS', threshold: 750000, progress: 162000, progressPct: 21.6 },
  { id: 'm3', card: 'Millennia', cardId: 'c2', milestone: 'Monthly 50k', windowStart: '2026-10-01', windowEnd: '2026-10-10', rewardType: 'CASH', threshold: 50000, progress: 10000, progressPct: 20 },
]);

describe('milestone progress model', () => {
  it('keeps the first (most progressed) milestone of each card', () => {
    const items = nearestPerCard(milestones, TODAY);
    expect(items.map((i) => i.id)).toEqual(['m1', 'm3']);
  });

  it('days left include today; the daily pace is what remains ÷ days left', () => {
    const [atlas, mill] = nearestPerCard(milestones, TODAY);
    expect(atlas.daysLeft).toBe(10);
    expect(atlas.perDay).toBe(13800);
    // The window's last day is today: one day left, the whole remainder today.
    expect(mill.daysLeft).toBe(1);
    expect(mill.perDay).toBe(40000);
  });

  it('no pace once achieved or the window has ended', () => {
    const done = rawTable(M_COLS, [{ id: 'a', card: 'A', cardId: 'a', windowEnd: '2026-10-20', threshold: 100, progress: 100, progressPct: 100 }]);
    expect(nearestPerCard(done, TODAY)[0].perDay).toBeNull();
    const ended = rawTable(M_COLS, [{ id: 'b', card: 'B', cardId: 'b', windowEnd: '2026-10-09', threshold: 100, progress: 10, progressPct: 10 }]);
    expect(nearestPerCard(ended, TODAY)[0]).toMatchObject({ daysLeft: 0, perDay: null });
  });

  it('reads basis and payout when the server sends them, and the reward type label', () => {
    const t = rawTable([...M_COLS, 'basis', 'payoutValue'], [
      { id: 'c', card: 'C', cardId: 'c', windowEnd: '2026-10-19', rewardType: 'POINTS', basis: 'TXN_COUNT', threshold: 20, progress: 10, progressPct: 50, payoutValue: 5000 },
    ]);
    t.columns.find((c) => c.key === 'rewardType')!.valueLabels = { POINTS: 'Reward points' };
    expect(nearestPerCard(t, TODAY)[0]).toMatchObject({ countsTransactions: true, payoutValue: 5000, rewardTypeLabel: 'Reward points' });
  });
});

describe('MilestoneProgressView', () => {
  it('a row per card: progress, days left, daily pace, payout hint, linking to the card on Rewards', () => {
    renderWithQuery(<MilestoneProgressView {...view(milestones)} />);
    const rows = screen.getAllByTestId('milestone-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Atlas · ₹3L quarterly');
    expect(rows[0]).toHaveTextContent('54%');
    expect(rows[0]).toHaveTextContent('₹1,62,000.00 of ₹3,00,000.00 · 10 days left · ₹13,800.00/day to hit it');
    expect(rows[0]).toHaveTextContent('Pays points');
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/rewards?account=c1');
    expect(rows[1]).toHaveTextContent('1 day left');
    expect(rows[1]).toHaveTextContent('Pays cash');
  });

  it('transaction-count milestones read as counts; a known payout shows its amount', () => {
    const t = rawTable([...M_COLS, 'basis', 'payoutValue'], [
      { id: 'c', card: 'C', cardId: 'c', milestone: '20 txns', windowEnd: '2026-10-19', rewardType: 'POINTS', basis: 'TXN_COUNT', threshold: 20, progress: 9, progressPct: 45, payoutValue: 5000 },
      { id: 'd', card: 'D', cardId: 'd', milestone: 'Spend', windowEnd: '2026-10-19', rewardType: 'CASH', threshold: 1000, progress: 1000, progressPct: 100, payoutValue: 250 },
    ]);
    renderWithQuery(<MilestoneProgressView {...view(t)} />);
    const [c, d] = screen.getAllByTestId('milestone-row');
    expect(c).toHaveTextContent('9 of 20 txns · 10 days left · 2 txn/day to hit it');
    expect(c).toHaveTextContent('Pays 5,000 pts');
    expect(d).toHaveTextContent('Reached');
    expect(d).not.toHaveTextContent('/day');
    expect(d).toHaveTextContent('Pays ₹250.00');
  });

  it('empty: no milestones in progress', () => {
    renderWithQuery(<MilestoneProgressView {...view(rawTable(M_COLS, []))} />);
    expect(screen.getByText('No milestones in progress')).toBeInTheDocument();
  });

  it('pages only when the rows span several pages', async () => {
    const onPage = vi.fn();
    const { unmount } = renderWithQuery(<MilestoneProgressView {...view(milestones, onPage)} />);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    unmount();
    renderWithQuery(<MilestoneProgressView {...view({ ...milestones, page: { number: 0, size: 50, totalElements: 60, totalPages: 2 } }, onPage)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<MilestoneProgressView {...view(pivot([]))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- cap_headroom

const C_COLS = ['card', 'cap', 'window', 'windowStart', 'windowEnd', 'cardholder', 'unit', 'capLimit', 'used', 'remaining', 'utilizationPct'];
const caps = rawTable(C_COLS, [
  { id: 'k1', card: 'Millennia', cardId: 'c2', cap: 'Amazon', windowEnd: '2026-10-31', cardholder: 'All cardholders', unit: 'RUPEES', capLimit: 1000, used: 600, utilizationPct: 60 },
  { id: 'k2', card: 'SBI', cardId: 'c3', cap: 'Online 5%', windowEnd: '2026-10-31', cardholder: 'Priya', unit: 'RUPEES', capLimit: 5000, used: 4600, utilizationPct: 92 },
  { id: 'k3', card: 'Atlas', cardId: 'c1', cap: 'Travel', windowEnd: '2026-10-31', cardholder: 'All cardholders', unit: 'POINTS', capLimit: 10000, used: 12000, utilizationPct: 120 },
]);

describe('cap headroom', () => {
  it('tone: under 80 neutral, 80–99 amber (near), 100+ hit', () => {
    expect(capTone(null)).toBe('neutral');
    expect(capTone(79.9)).toBe('neutral');
    expect(capTone(80)).toBe('near');
    expect(capTone(99.9)).toBe('near');
    expect(capTone(100)).toBe('hit');
  });

  it('rows most used first with units, cardholder, window end and a link to the card', () => {
    renderWithQuery(<CapHeadroomView {...view(caps)} />);
    const rows = screen.getAllByTestId('cap-row');
    expect(rows.map((r) => r.getAttribute('data-tone'))).toEqual(['hit', 'near', 'neutral']);
    expect(rows[0]).toHaveTextContent('Atlas · Travel');
    expect(within(rows[0]).getByText('Cap hit')).toHaveClass('text-rose-600');
    expect(rows[0]).toHaveTextContent('12,000 pts of 10,000 pts · resets after');
    expect(rows[1]).toHaveTextContent('SBI · Online 5% · Priya');
    expect(within(rows[1]).getByText('92%')).toHaveClass('text-amber-600');
    expect(rows[1]).toHaveTextContent('₹4,600.00 of ₹5,000.00');
    expect(rows[2]).not.toHaveTextContent('All cardholders');
    expect(within(rows[2]).getByText('60%')).toHaveClass('text-slate-600');
    expect(within(rows[1]).getByRole('link')).toHaveAttribute('href', '/rewards?account=c3');
  });

  it('empty: no caps this cycle', () => {
    renderWithQuery(<CapHeadroomView {...view(rawTable(C_COLS, []))} />);
    expect(screen.getByText('No reward caps this cycle')).toBeInTheDocument();
  });

  it('the window end reads dd/mm/yyyy, as dates do across the app', () => {
    renderWithQuery(<CapHeadroomView {...view(caps)} />);
    expect(screen.getAllByTestId('cap-row')[0]).toHaveTextContent('resets after 31/10/2026');
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<CapHeadroomView {...view(pivot([]))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- rewards_earned

const earned = pivot([
  { card: 'Atlas', cardId: 'c1', cells: { cashInr_sum: 0, points_sum: 42300, pointsValueInr_sum: 14100, valueInr_sum: 14100 } },
  { card: 'SBI Cashback', cardId: 'c3', cells: { cashInr_sum: 3240, points_sum: 0, pointsValueInr_sum: 0, valueInr_sum: 3240 } },
  { card: 'Amex', cardId: 'c4', cells: { cashInr_sum: 0, points_sum: 18000, pointsValueInr_sum: 0, valueInr_sum: 0 } },
  { card: 'Mixed', cardId: 'c5', cells: { cashInr_sum: 100, points_sum: 500, pointsValueInr_sum: 0, valueInr_sum: 100 } },
]);

describe('rewards earned', () => {
  it('headline = cashback + valued points; unvalued points counted apart', () => {
    const m = buildRewardsEarned(earned);
    expect(m.totalInr).toBe(17440);
    expect(m.unvaluedPoints).toBe(18500);
    expect(m.rows.map((r) => [r.cardId, r.unvalued])).toEqual([['c1', false], ['c3', false], ['c4', true], ['c5', true]]);
  });

  it('native unit text per card', () => {
    const [atlas, sbi, amex, mixed] = buildRewardsEarned(earned).rows;
    expect(nativeText(atlas)).toBe('42,300 pts ≈ ₹14,100');
    expect(nativeText(sbi)).toBe('₹3,240');
    expect(nativeText(amex)).toBe('18,000 pts');
    expect(nativeText(mixed)).toBe('500 pts + ₹100');
    expect(nativeText({ ...sbi, cash: 0 })).toBe('₹0');
  });

  it('the requests: this FY, plus the card when one is tapped', () => {
    expect(rewardsRequest(null)).toEqual({
      type: 'KPI', datasource: 'reward_earnings',
      definition: { measure: 'valueInr', aggregation: 'sum', filters: [{ field: 'effectiveDate', operator: 'current_fy' }], comparison: { enabled: false } },
    });
    expect(rewardsRequest('c1').definition).toMatchObject({
      filters: [{ field: 'effectiveDate', operator: 'current_fy' }, { field: 'card', operator: 'is', value: 'c1' }],
    });
  });

  it('renders the headline, the per-card lines, Set value links and the unvalued line', () => {
    renderWithQuery(<RewardsEarnedView {...view(earned)} widget={widget('rewards_earned', {}, { title: 'Rewards' })} />);
    expect(screen.getByRole('button', { name: /— view underlying data$/ })).toHaveTextContent('₹17,440');
    expect(screen.getByTestId('rewards-unvalued')).toHaveTextContent('+ 18,500 points not valued');
    const rows = screen.getAllByTestId('rewards-row');
    expect(rows[0]).toHaveTextContent('Atlas42,300 pts ≈ ₹14,100');
    expect(within(rows[0]).queryByText('Set value')).not.toBeInTheDocument();
    expect(within(rows[2]).getByRole('link', { name: 'Set value' })).toHaveAttribute('href', '/rewards/rules?account=c4');
  });

  it('the headline opens the FY rewards; a card opens its own', async () => {
    renderWithQuery(<RewardsEarnedView {...view(earned)} widget={widget('rewards_earned', {}, { title: 'Rewards' })} />);
    await userEvent.click(screen.getByRole('button', { name: /— view underlying data$/ }));
    expect(dialogProps(await screen.findByTestId('kpi-dialog'))).toEqual({
      source: { kind: 'adhoc', request: rewardsRequest(null) }, title: 'Rewards', open: true,
    });
    await userEvent.click(screen.getByText('close dialog'));
    await userEvent.click(screen.getByRole('button', { name: /— view SBI Cashback rewards$/ }));
    expect(dialogProps(await screen.findByTestId('kpi-dialog'))).toEqual({
      source: { kind: 'adhoc', request: rewardsRequest('c3') }, title: 'Rewards · SBI Cashback', open: true,
    });
  });

  it("an unvalued card's points are not tappable (their drill would read ₹0); only its cashback drills", async () => {
    renderWithQuery(<RewardsEarnedView {...view(earned)} widget={widget('rewards_earned', {}, { title: 'Rewards' })} />);
    const rows = screen.getAllByTestId('rewards-row');
    // Amex: 18,000 pts, no point value, no cashback → plain text, Set value kept.
    expect(rows[2]).toHaveTextContent('18,000 pts');
    expect(within(rows[2]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[2]).getByRole('link', { name: 'Set value' })).toBeInTheDocument();
    // Mixed: 500 unvalued pts + ₹100 cashback → only "₹100" opens the card's ₹100 of rewards.
    const mixed = within(rows[3]).getByRole('button', { name: /— view Mixed rewards$/ });
    expect(mixed).toHaveTextContent(/^₹100/);
    expect(mixed).not.toHaveTextContent('pts');
    expect(rows[3]).toHaveTextContent('500 pts + ₹100');
    await userEvent.click(mixed);
    expect(dialogProps(await screen.findByTestId('kpi-dialog'))).toEqual({
      source: { kind: 'adhoc', request: rewardsRequest('c5') }, title: 'Rewards · Mixed', open: true,
    });
  });

  it('a row without a card id is not drillable and offers no Set value link', () => {
    renderWithQuery(<RewardsEarnedView {...view(pivot([{ card: 'Old', cells: { points_sum: 10, pointsValueInr_sum: 0 } }]))} />);
    expect(screen.queryByRole('button', { name: /— view Old rewards$/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Set value')).not.toBeInTheDocument();
  });

  it('empty: no rewards yet this FY; other shapes are not drawn', () => {
    const { unmount } = renderWithQuery(<RewardsEarnedView {...view(pivot([]))} />);
    expect(screen.getByText('No rewards yet this financial year')).toBeInTheDocument();
    unmount();
    renderWithQuery(<RewardsEarnedView {...view(rawTable([], []))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
