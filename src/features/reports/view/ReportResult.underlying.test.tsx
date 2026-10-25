import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { catalogFixture } from '@/features/reports/builder/editor.fixtures';
import { workingCatalog } from '@/features/reports/builder/editorState';
import type { PivotTableData } from '@/lib/reports.types';

import { ReportResult } from './ReportResult';

const catalog = workingCatalog(catalogFixture, 'transactions');
const user = userEvent.setup({ pointerEventsCheck: 0 });

const pivot: PivotTableData = {
  type: 'TABLE',
  mode: 'aggregated',
  rowDimensions: [{ field: 'category', label: 'Category' }],
  columnDimensions: [],
  measures: [{ key: 'spend_sum', field: 'spend', aggregation: 'sum', label: 'Sum of Spend', format: 'currency' }],
  columns: [{ key: '', values: {} }],
  rows: [
    { key: 'food', values: { category: 'Food & dining' }, cells: { '': { spend_sum: 42180 } } },
    { key: 'other', values: { category: '(none)' }, cells: { '': { spend_sum: 900 } } },
  ],
  page: { number: 0, size: 50, totalElements: 2, totalPages: 1 },
};

describe('opening the rows behind a figure', () => {
  it('opens an aggregated table row by its key', async () => {
    const onOpenTableRow = vi.fn();
    render(<ReportResult data={pivot} catalog={catalog} onOpenTableRow={onOpenTableRow} />);
    await user.click(screen.getAllByText('Food & dining')[0]);
    expect(onOpenTableRow).toHaveBeenCalledWith('food');
  });

  it('does not open a row the page says cannot be opened', async () => {
    const onOpenTableRow = vi.fn();
    render(<ReportResult data={pivot} catalog={catalog} onOpenTableRow={onOpenTableRow} canOpenTableRow={(key) => key !== 'other'} />);
    await user.click(screen.getAllByText('(none)')[0]);
    expect(onOpenTableRow).not.toHaveBeenCalled();
  });
});
