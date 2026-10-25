import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({ request, onClose }: { request: unknown; onClose: () => void }) => (
    <div data-testid="underlying-dialog" data-request={JSON.stringify(request)}>
      <button onClick={onClose}>close dialog</button>
    </div>
  ),
}));

import type { ReportData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { kpi, pivot, widget } from '../testFixtures';
import { RewardsEarnedView } from './RewardsEarnedView';

const view = (data: ReportData) => ({ widget: widget('rewards_earned'), data, onPageChange: vi.fn() });

const data = pivot([
  { card: 'Atlas', cardId: 'c1', cells: { cashInr_sum: 0, points_sum: 42300, pointsValueInr_sum: 14100 } },
  { card: 'Millennia', cardId: 'c2', cells: { cashInr_sum: 3240, points_sum: 0, pointsValueInr_sum: 0 } },
  { card: 'Regalia', cardId: 'c3', cells: { cashInr_sum: 0, points_sum: 18000, pointsValueInr_sum: 0 } },
]);

const requestOf = () => JSON.parse(screen.getByTestId('underlying-dialog').getAttribute('data-request') ?? '{}');

describe('RewardsEarnedView', () => {
  it('headline in rupees, each card in its own unit, unvalued points noted apart', () => {
    renderWithQuery(<RewardsEarnedView {...view(data)} />);
    expect(screen.getByRole('button', { name: '₹17,340' })).toBeInTheDocument();
    expect(screen.getByTestId('rewards-unvalued')).toHaveTextContent('+ 18,000 points not valued');
    const [atlas, millennia, regalia] = screen.getAllByTestId('rewards-row');
    expect(atlas).toHaveTextContent('Atlas');
    expect(atlas).toHaveTextContent('42,300 pts');
    expect(atlas).not.toHaveTextContent('≈');
    expect(millennia).toHaveTextContent('₹3,240');
    expect(regalia).toHaveTextContent('18,000 pts');
  });

  it('a card with unvalued points has no Set value link and its points are not tappable', () => {
    renderWithQuery(<RewardsEarnedView {...view(data)} />);
    const regalia = screen.getAllByTestId('rewards-row')[2];
    expect(within(regalia).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Set value')).not.toBeInTheDocument();
    expect(within(regalia).queryByRole('button')).not.toBeInTheDocument();
  });

  it('rows have no divider lines and sit at the header inset (no padding of their own)', () => {
    renderWithQuery(<RewardsEarnedView {...view(data)} />);
    for (const row of screen.getAllByTestId('rewards-row')) {
      expect(row.className).not.toMatch(/border-t\b(?!-)/);
      expect(row.className).toMatch(/px-0/);
    }
  });

  it('the headline opens the underlying data of the whole year; a card figure opens that card only', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RewardsEarnedView {...view(data)} />);
    await user.click(screen.getByRole('button', { name: '₹17,340' }));
    expect(requestOf().definition.filters.map((f: { field: string }) => f.field)).toEqual(['effectiveDate']);
    await user.click(screen.getByRole('button', { name: 'close dialog' }));
    expect(screen.queryByTestId('underlying-dialog')).not.toBeInTheDocument();

    await user.click(within(screen.getAllByTestId('rewards-row')[1]).getByRole('button', { name: '₹3,240' }));
    const filters = requestOf().definition.filters as Array<{ field: string; value: unknown }>;
    expect(filters.map((f) => f.field)).toEqual(['effectiveDate', 'card']);
    expect(filters[1].value).toBe('c2');
  });

  it('empty: no rewards yet this financial year', () => {
    renderWithQuery(<RewardsEarnedView {...view(pivot([]))} />);
    expect(screen.getByText('No rewards yet this financial year')).toBeInTheDocument();
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<RewardsEarnedView {...view(kpi(1))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
