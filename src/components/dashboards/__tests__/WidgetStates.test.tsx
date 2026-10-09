import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WidgetReportContent } from '@/components/dashboards/WidgetStates';
import type { KpiData, TableData } from '@/lib/reports.types';

const kpi: KpiData = {
  type: 'KPI', value: 7, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null,
  meta: { rowCount: 1, dateRange: null },
};
const table: TableData = {
  type: 'TABLE', mode: 'raw', columns: [{ key: 'name', label: 'Name', type: 'string' }], rows: [{ id: '1', name: 'A' }],
  page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
};
const base = { available: true, error: null, onPageChange: vi.fn(), onSizeChange: vi.fn() };

describe('WidgetReportContent pass-through', () => {
  it('hands onKpiValueClick to a KPI widget', () => {
    const onKpiValueClick = vi.fn();
    render(<WidgetReportContent {...base} kind="kpi" data={kpi} onKpiValueClick={onKpiValueClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'View underlying data' }));
    expect(onKpiValueClick).toHaveBeenCalledTimes(1);
  });

  it('hands sort and onSortChange to a table widget', () => {
    const onSortChange = vi.fn();
    render(
      <WidgetReportContent {...base} kind="table" data={table} sort={{ key: 'name', direction: 'desc' }} onSortChange={onSortChange} />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith(null);
  });
});
