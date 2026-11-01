import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

import { CategoryFilterChip, TagsFilterChip } from './CategoryFilterChips';
import { NO_CATEGORY_FILTER } from './categoryFilterModel';

const row = (title: string) => screen.getByText(title).closest('[role="button"]') as HTMLElement;

describe('CategoryFilterChip', () => {
  const setup = (value = NO_CATEGORY_FILTER) => {
    const onCommit = vi.fn();
    render(<CategoryFilterChip value={value} categories={CATEGORY_LIST_FIXTURE} uncategorizedCount={23} onCommit={onCommit} />);
    return { onCommit, user: userEvent.setup({ pointerEventsCheck: 0 }) };
  };

  it('lists Uncategorized first with its count, then every category with no count of its own', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Category/ }));
    const titles = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(titles.findIndex((t) => t.startsWith('Uncategorized'))).toBeLessThan(titles.findIndex((t) => t.startsWith('Food')));
    expect(row('Uncategorized')).toHaveTextContent('23');
    expect(row('Food')).not.toHaveTextContent(/\d/);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('ticking a category and closing commits it once, subs included', async () => {
    const { user, onCommit } = setup();
    await user.click(screen.getByRole('button', { name: /Category/ }));
    await user.click(row('Food'));
    await user.click(row('Transport'));
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ uncategorized: false, categories: ['food', 'transport'], subcategories: [] });
  });

  it('the chevron opens the sub-categories to narrow to one', async () => {
    const { user, onCommit } = setup();
    await user.click(screen.getByRole('button', { name: /Category/ }));
    await user.click(screen.getAllByRole('button', { name: /^Show sub-categories$/ })[0]);
    expect(screen.getByText('Dining')).toBeInTheDocument();
    await user.click(row('Delivery'));
    await user.keyboard('{Escape}');
    expect(onCommit).toHaveBeenCalledWith({ uncategorized: false, categories: ['food'], subcategories: ['food.delivery'] });
  });

  it('Uncategorized commits as its own flag, beside a ticked category', async () => {
    const { user, onCommit } = setup({ uncategorized: false, categories: ['food'], subcategories: [] });
    await user.click(screen.getByRole('button', { name: /Category/ }));
    await user.click(row('Uncategorized'));
    await user.keyboard('{Escape}');
    expect(onCommit).toHaveBeenCalledWith({ uncategorized: true, categories: ['food'], subcategories: [] });
  });

  it('closing without a change commits nothing; the chip names what is picked', async () => {
    const { user, onCommit } = setup({ uncategorized: false, categories: ['food'], subcategories: [] });
    expect(screen.getByRole('button', { name: /Category · Food/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Category · Food/ }));
    await user.keyboard('{Escape}');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('the search finds a sub-category and opens its category', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Category/ }));
    await user.type(screen.getByRole('searchbox', { name: 'Search categories' }), 'cab');
    expect(screen.getByText('Cabs')).toBeInTheDocument();
    expect(screen.queryByText('Food')).toBeNull();
  });
});

describe('TagsFilterChip', () => {
  const tags = [
    { id: 't1', name: 'Goa trip', transactionCount: 14 },
    { id: 't2', name: 'Work', transactionCount: 38 },
    { id: 't3', name: 'Empty', transactionCount: 0 },
  ];

  it('lists Untagged first, then the tags that carry transactions with their counts', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TagsFilterChip value={{ untagged: false, tags: [] }} tags={tags} onCommit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Tags/ }));
    const titles = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(titles.findIndex((t) => t.startsWith('Untagged'))).toBeLessThan(titles.findIndex((t) => t.startsWith('Goa trip')));
    expect(row('Goa trip')).toHaveTextContent('14');
    expect(screen.queryByText('Empty')).toBeNull();
  });

  it('commits Untagged, or the ticked tags, once on close', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TagsFilterChip value={{ untagged: false, tags: [] }} tags={tags} onCommit={onCommit} />);
    await user.click(screen.getByRole('button', { name: /Tags/ }));
    await user.click(row('Goa trip'));
    await user.click(row('Work'));
    await user.keyboard('{Escape}');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ untagged: false, tags: ['t1', 't2'] });
    onCommit.mockClear();
    await user.click(screen.getByRole('button', { name: /Tags/ }));
    await user.click(row('Untagged'));
    await user.keyboard('{Escape}');
    expect(onCommit).toHaveBeenCalledWith({ untagged: true, tags: [] });
  });

  it('is off while the tags could not be loaded', () => {
    render(<TagsFilterChip value={{ untagged: false, tags: [] }} tags={null} onCommit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Tags/ })).toBeDisabled();
  });
});
