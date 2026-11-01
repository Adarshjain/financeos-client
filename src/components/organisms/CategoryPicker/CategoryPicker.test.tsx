import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

import { CategoryPicker, type CategoryPickerProps } from './CategoryPicker';

/** A list row (a role=button div) by its title. */
const rowOf = (title: string) => screen.getByText(title).closest('[role="button"]') as HTMLElement;

const setup = (props: Partial<CategoryPickerProps> = {}) => {
  const onPick = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <CategoryPicker
      open
      onOpenChange={onOpenChange}
      categories={CATEGORY_LIST_FIXTURE}
      subtitle="Swiggy · ₹486.00"
      onPick={onPick}
      {...props}
    />,
  );
  return { onPick, onOpenChange, user: userEvent.setup({ pointerEventsCheck: 0 }) };
};

describe('CategoryPicker', () => {
  it('shows the money-out categories in list order, and the transaction as the subtitle', () => {
    setup();
    expect(screen.getByText('Swiggy · ₹486.00')).toBeInTheDocument();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names.indexOf('Food')).toBeLessThan(names.indexOf('Groceries'));
    expect(names.indexOf('Groceries')).toBeLessThan(names.indexOf('Transport'));
    expect(screen.queryByRole('button', { name: 'Salary' })).not.toBeInTheDocument();
  });

  it('shows the money-in categories for a credit, with the both-way ones', () => {
    setup({ direction: 'IN' });
    expect(screen.getByRole('button', { name: 'Salary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gifts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Food' })).not.toBeInTheDocument();
  });

  it('saves a category with no sub-categories in one tap and closes', async () => {
    const { user, onPick, onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Gifts' }));
    expect(onPick).toHaveBeenCalledWith({ categoryKey: 'gifts', subcategoryKey: null });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('opens the sub-category list for a category with subs, saving nothing yet, and saves on a sub tap', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: 'Food' }));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    await user.click(screen.getByText('Delivery'));
    expect(onPick).toHaveBeenCalledWith({ categoryKey: 'food', subcategoryKey: 'food.delivery' });
  });

  it('lists Others last, ticked by default, and saves the category with no sub when tapped', async () => {
    const { user, onPick } = setup({ initialCategoryKey: 'food' });
    const rows = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    const last = rows.filter((t) => /^(Dining|Delivery|Cafés|Drinks|Snacks|Others)/.test(t)).at(-1);
    expect(last).toContain('Others');
    expect(screen.getByText('Food with no sub-category')).toBeInTheDocument();
    expect(rowOf('Others').querySelector('svg')).toBeInTheDocument();
    await user.click(screen.getByText('Others'));
    expect(onPick).toHaveBeenCalledWith({ categoryKey: 'food', subcategoryKey: null });
  });

  it('on reopening shows the current pick: the category marked in the grid and its sub ticked inside', async () => {
    const { user } = setup({ value: { categoryKey: 'food', subcategoryKey: 'food.delivery' } });
    const food = screen.getByRole('button', { name: 'Food' });
    expect(food.querySelector('.bg-brand')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Groceries' }).querySelector('.bg-brand')).not.toBeInTheDocument();
    await user.click(food);
    expect(rowOf('Delivery').querySelector('svg')).toBeInTheDocument();
    expect(rowOf('Dining').querySelector('svg')).not.toBeInTheDocument();
    expect(rowOf('Others').querySelector('svg')).not.toBeInTheDocument();
  });

  it('finds a sub-category by an everyday word and saves it at once', async () => {
    const { user, onPick } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Search categories' }), 'zom');
    expect(screen.getByText('Food · Delivery')).toBeInTheDocument();
    await user.click(screen.getByText('Food · Delivery'));
    expect(onPick).toHaveBeenCalledWith({ categoryKey: 'food', subcategoryKey: 'food.delivery' });
  });

  it('opens the list of a category found by name instead of saving it', async () => {
    const { user, onPick } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Search categories' }), 'trans');
    await user.click(screen.getByText('Transport'));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByText('Cabs')).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Search categories' }), 'zzzz');
    expect(screen.getByText(/No match/)).toBeInTheDocument();
  });

  it('shows the Recent row in the grid only when there are recent picks, and saves one in a tap', async () => {
    const recent = [{ categoryKey: 'transport', subcategoryKey: 'transport.cabs' }];
    const { user, onPick } = setup({ recent });
    await user.click(screen.getByRole('button', { name: 'Transport · Cabs' }));
    expect(onPick).toHaveBeenCalledWith(recent[0]);
  });

  it('hides the Recent row when empty', () => {
    setup({ recent: [] });
    expect(screen.queryByRole('button', { name: /·/ })).not.toBeInTheDocument();
  });
});
