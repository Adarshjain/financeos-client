import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

import { CategoryField, TagsField } from './CategoryField';
import { type CategoryFilter, NO_CATEGORY_FILTER } from './categoryFilterModel';

const row = (name: RegExp | string) => screen.getByRole('option', { name });

function CategoryHarness({ start = NO_CATEGORY_FILTER, onChange }: { start?: CategoryFilter; onChange: (f: CategoryFilter) => void }) {
  const [value, setValue] = React.useState(start);
  return (
    <CategoryField
      value={value}
      categories={CATEGORY_LIST_FIXTURE}
      onValueChange={(f) => {
        setValue(f);
        onChange(f);
      }}
    />
  );
}

describe('CategoryField', () => {
  it('lists Uncategorized first, then every category', () => {
    render(<CategoryHarness onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const names = screen.getAllByRole('option').map((o) => o.textContent ?? '');
    expect(names[0]).toMatch(/^Uncategorized/);
    expect(names.findIndex((t) => t.startsWith('Food'))).toBeGreaterThan(0);
  });

  it('ticking a category is whole, and Uncategorized is its own flag', () => {
    const onChange = vi.fn();
    render(<CategoryHarness onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(row(/^Food/));
    fireEvent.click(row('Uncategorized'));
    expect(onChange).toHaveBeenLastCalledWith({ uncategorized: true, categories: ['food'], subcategories: [] });
  });

  it('the chevron opens sub-categories to narrow to one, half-ticking the category with a "k of n" line', () => {
    const onChange = vi.fn();
    render(<CategoryHarness onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
    fireEvent.click(row('Delivery'));
    expect(onChange).toHaveBeenLastCalledWith({ uncategorized: false, categories: ['food'], subcategories: ['food.delivery'] });
    expect(row(/^Food/).querySelector('[aria-checked="mixed"]')).not.toBeNull();
    expect(row(/^Food/)).toHaveTextContent(/1 of \d+ sub-categories/);
  });

  it('the search finds a sub-category under its category', () => {
    render(<CategoryHarness onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cab' } });
    expect(screen.getByText('Cabs')).toBeInTheDocument();
    expect(screen.queryByText('Food')).toBeNull();
  });

  it('is off while the list could not be loaded', () => {
    render(<CategoryField value={NO_CATEGORY_FILTER} categories={null} onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});

describe('TagsField', () => {
  const tags = [
    { id: 't1', name: 'Goa trip', transactionCount: 14 },
    { id: 't2', name: 'Work', transactionCount: 38 },
    { id: 't3', name: 'Empty', transactionCount: 0 },
  ];

  it('lists Untagged first, then tags that carry transactions with counts, and picks them', () => {
    const onChange = vi.fn();
    render(<TagsField value={{ untagged: false, tags: [] }} tags={tags} onValueChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    const names = screen.getAllByRole('option').map((o) => o.textContent ?? '');
    expect(names[0]).toMatch(/^Untagged/);
    expect(row(/Goa trip/)).toHaveTextContent('14');
    expect(screen.queryByText('Empty')).toBeNull();
    fireEvent.click(row(/Work/));
    expect(onChange).toHaveBeenLastCalledWith({ untagged: false, tags: ['t2'] });
  });

  it('is off while the tags could not be loaded', () => {
    render(<TagsField value={{ untagged: false, tags: [] }} tags={null} onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
