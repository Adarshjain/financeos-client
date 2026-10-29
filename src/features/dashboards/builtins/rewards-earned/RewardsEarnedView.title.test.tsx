import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({ title, onClose }: { title?: string; onClose: () => void }) => (
    <div data-testid="underlying-dialog" data-title={title}>
      <button onClick={onClose}>close dialog</button>
    </div>
  ),
}));

import { pivot, widget } from '@/features/dashboards/builtins/testFixtures';
import { renderWithQuery } from '@/test/renderWithQuery';

import { RewardsEarnedView } from './RewardsEarnedView';

const data = pivot([
  { card: 'Atlas', cardId: 'c1', cells: { cashInr_sum: 0, points_sum: 42300, pointsValueInr_sum: 14100 } },
  { card: 'Millennia', cardId: 'c2', cells: { cashInr_sum: 3240, points_sum: 0, pointsValueInr_sum: 0 } },
]);
const view = { widget: widget('rewards_earned'), data, onPageChange: vi.fn() };

describe('RewardsEarnedView drill titles', () => {
  it('the headline dialog is titled with the widget and the rupee headline', async () => {
    renderWithQuery(<RewardsEarnedView {...view} />);
    await userEvent.click(screen.getByRole('button', { name: '₹17,340' }));
    expect(screen.getByTestId('underlying-dialog')).toHaveAttribute('data-title', 'Widget · ₹17,340');
  });

  it('a card dialog is titled with the widget, the card and its rupee value', async () => {
    renderWithQuery(<RewardsEarnedView {...view} />);
    const [atlas, millennia] = screen.getAllByTestId('rewards-row');
    await userEvent.click(within(atlas).getByRole('button'));
    expect(screen.getByTestId('underlying-dialog')).toHaveAttribute('data-title', 'Widget · Atlas · ₹14,100');
    await userEvent.click(screen.getByRole('button', { name: 'close dialog' }));
    await userEvent.click(within(millennia).getByRole('button'));
    expect(screen.getByTestId('underlying-dialog')).toHaveAttribute('data-title', 'Widget · Millennia · ₹3,240');
  });
});
