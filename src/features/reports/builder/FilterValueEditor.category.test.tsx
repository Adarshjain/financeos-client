import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldDefinition } from '@/lib/reports.types';

import { FilterValueEditor } from './FilterValueEditor';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const field = (name: string): FieldDefinition => ({
  name,
  label: name,
  type: 'enum',
  role: 'dimension',
  dynamic: true,
  idField: `${name}Key`,
  allowedInReports: ['CHART', 'TABLE'],
});

// Server order, which is not alphabetical.
const options = {
  category: [{ id: 'food', name: 'Food' }, { id: 'bills', name: 'Bills' }, { id: 'travel', name: 'Travel' }],
  subcategory: [{ id: 'food.delivery', name: 'Food · Delivery' }, { id: 'bills.rent', name: 'Bills · Rent' }],
  broker: [{ id: 'z', name: 'Zerodha' }, { id: 'g', name: 'Groww' }],
};

const open = async (name: keyof typeof options, kind: 'scalarEnum' | 'multi') => {
  render(<FilterValueEditor kind={kind} field={field(name)} dynamicOptions={options} value={undefined} onChange={vi.fn()} />);
  await user.click(screen.getByRole('combobox'));
};

describe('FilterValueEditor dropdowns', () => {
  it.each(['category', 'subcategory'] as const)('has a search box for %s with "is", even with few values', async (name) => {
    await open(name, 'scalarEnum');
    expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument();
  });

  it.each(['category', 'subcategory'] as const)('has a search box for %s with "in"', async (name) => {
    await open(name, 'multi');
    expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument();
  });

  it('keeps the server order of the values', async () => {
    await open('category', 'scalarEnum');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Food', 'Bills', 'Travel']);
  });

  it('keeps the server order of sub-category labels', async () => {
    await open('subcategory', 'scalarEnum');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Food · Delivery', 'Bills · Rent']);
  });

  it('leaves a short single-value list of another field without a search box', async () => {
    await open('broker', 'scalarEnum');
    expect(screen.queryByPlaceholderText(/Search/)).not.toBeInTheDocument();
  });
});
