import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CompletedMilestones, MilestoneModel } from './rewardsModel';
import { MilestonesCard } from './RewardsSections';

const pending: { key: string; model: MilestoneModel }[] = [
  {
    key: 'm1',
    model: {
      title: 'Spend ₹4L',
      subtitle: 'Reward year',
      status: null,
      figure: { done: '₹1,00,000', of: 'of ₹4,00,000' },
      pct: 25,
      caption: '₹3,00,000 to go',
    } as MilestoneModel,
  },
];

const completed: CompletedMilestones = {
  count: 2,
  paid: '₹2,500 + 5,000 pts',
  rows: [
    { id: 'c1', title: 'Spend ₹1L', subtitle: 'Credited 3 Apr', payout: '₹1,500' },
    { id: 'c2', title: 'Spend ₹2L', subtitle: 'Credited 9 Jan', payout: '₹1,000' },
  ],
};

describe('MilestonesCard', () => {
  it('shows the completed milestones inside the Milestones card, after the pending ones, with count and paid', () => {
    const { container } = render(<MilestonesCard items={pending} completed={completed} />);
    expect(screen.getAllByText('Milestones')).toHaveLength(1);
    const text = container.textContent ?? '';
    expect(text.indexOf('Spend ₹4L')).toBeLessThan(text.indexOf('Completed · 2'));
    expect(text.indexOf('Completed · 2')).toBeLessThan(text.indexOf('Spend ₹1L'));
    expect(screen.getByText('₹2,500 + 5,000 pts paid')).toBeInTheDocument();
    expect(within(container).getByText('₹1,500')).toBeInTheDocument();
    expect(screen.queryByText('Completed · 2', { selector: 'h2, h3' })).toBeNull();
  });

  it('shows only the completed section when nothing is pending, and no section when nothing is completed', () => {
    const { rerender } = render(<MilestonesCard items={[]} completed={completed} />);
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByText('Completed · 2')).toBeInTheDocument();
    rerender(<MilestonesCard items={pending} completed={null} />);
    expect(screen.queryByText(/Completed/)).toBeNull();
  });
});
