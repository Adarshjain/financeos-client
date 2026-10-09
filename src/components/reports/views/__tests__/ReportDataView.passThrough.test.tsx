import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportDataView } from '@/components/reports/views/ReportDataView';
import type { KpiData, PivotTableData, TableData } from '@/lib/reports.types';

const page = { number: 0, size: 25, totalElements: 1, totalPages: 1 };
const kpi: KpiData = {
  type: 'KPI', value: 5, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null,
  meta: { rowCount: 1, dateRange: null },
};
const raw: TableData = {
  type: 'TABLE', mode: 'raw', columns: [{ key: 'name', label: 'Name', type: 'string' }], rows: [{ id: '1', name: 'A' }], page,
};
const pivot: PivotTableData = {
  type: 'TABLE', mode: 'aggregated', rowDimensions: [{ field: 'category', label: 'Category' }], columnDimensions: [],
  measures: [{ key: 'amount_sum', field: 'amount', aggregation: 'sum', label: 'Amount' }],
  columns: [{ key: '', values: {} }], rows: [{ key: 'r', values: { category: 'Food' }, cells: { '': { amount_sum: 1 } } }], page,
};

describe('ReportDataView pass-through', () => {
  it.each([true, false])('hands onKpiValueClick to the KPI view (fill=%s)', (fill) => {
    const onKpiValueClick = vi.fn();
    render(<ReportDataView data={kpi} fill={fill} onKpiValueClick={onKpiValueClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'View underlying data' }));
    expect(onKpiValueClick).toHaveBeenCalledTimes(1);
  });

  it('hands sort and onSortChange to the raw table', () => {
    const onSortChange = vi.fn();
    render(<ReportDataView data={raw} sort={{ key: 'name', direction: 'asc' }} onSortChange={onSortChange} onKpiValueClick={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'desc' });
    expect(screen.queryByRole('button', { name: 'View underlying data' })).toBeNull();
  });

  it('hands sort and onSortChange to the pivot table', () => {
    const onSortChange = vi.fn();
    render(<ReportDataView data={pivot} sort={{ key: 'amount_sum', direction: 'desc' }} onSortChange={onSortChange} />);
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'category', direction: 'asc' });
  });
});
