import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

import { CategoryPicker } from './CategoryPicker';

describe('CategoryPicker direction ANY', () => {
  const setup = () => {
    const onPick = vi.fn();
    render(<CategoryPicker open categories={CATEGORY_LIST_FIXTURE} direction="ANY" onPick={onPick} />);
    return { onPick, user: userEvent.setup({ pointerEventsCheck: 0 }) };
  };

  it('offers money-out and money-in categories in one grid, the out ones first, a both-way one once', () => {
    setup();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names.indexOf('Food')).toBeGreaterThan(-1);
    expect(names.indexOf('Salary')).toBeGreaterThan(names.indexOf('Food'));
    expect(names.filter((n) => n === 'Gifts')).toHaveLength(1);
  });

  it('saves a money-in category for a rule', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    expect(onPick).toHaveBeenCalledWith({ categoryKey: 'refund', subcategoryKey: null });
  });

  it('finds a money-in sub-category by search', async () => {
    const { user, onPick } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Search categories' }), 'bonus');
    await user.click(screen.getByText(/Bonus/));
    expect(onPick).toHaveBeenCalledWith({ categoryKey: 'salary', subcategoryKey: 'salary.bonus' });
  });
});
