import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KpiConfig } from '@/components/reports/KpiConfig';
import type { DatasourceCatalog } from '@/lib/reports.types';

const catalog = {
  name: 'transactions',
  label: 'Transactions',
  fields: [
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      role: 'measure',
      aggregations: ['sum', 'avg'],
      allowedInReports: ['KPI', 'CHART', 'TABLE'],
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      role: 'dimension',
      allowedInReports: ['KPI', 'CHART', 'TABLE'],
    },
  ],
} as unknown as DatasourceCatalog;

const noDateCatalog = {
  ...catalog,
  fields: catalog.fields.filter((f) => f.type !== 'date'),
} as DatasourceCatalog;

describe('KpiConfig comparison display', () => {
  it('offers the display choice only while the comparison is on', () => {
    const { rerender } = render(
      <KpiConfig catalog={catalog} value={{ measure: 'amount', aggregation: 'sum', comparisonEnabled: true }} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('combobox', { name: 'Show' })).toHaveTextContent('Change vs previous period');

    rerender(
      <KpiConfig catalog={catalog} value={{ measure: 'amount', aggregation: 'sum', comparisonEnabled: false }} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('combobox', { name: 'Show' })).toBeNull();
  });

  it('reflects a saved previous-value preference', () => {
    render(
      <KpiConfig
        catalog={catalog}
        value={{ measure: 'amount', aggregation: 'sum', comparisonEnabled: true, comparisonDisplay: 'previous_value' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Show' })).toHaveTextContent('Previous period value');
  });

  it('emits previous_value when picked and clears back to the default for change', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <KpiConfig catalog={catalog} value={{ measure: 'amount', aggregation: 'sum', comparisonEnabled: true }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Show' }));
    fireEvent.click(screen.getByText('Previous period value'));
    expect(onChange).toHaveBeenCalledWith({ comparisonDisplay: 'previous_value' });

    rerender(
      <KpiConfig
        catalog={catalog}
        value={{ measure: 'amount', aggregation: 'sum', comparisonEnabled: true, comparisonDisplay: 'previous_value' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Show' }));
    fireEvent.click(screen.getByText('Change vs previous period'));
    expect(onChange).toHaveBeenLastCalledWith({ comparisonDisplay: undefined });
  });

  it('hides the display choice with the comparison when the datasource has no date field', () => {
    render(
      <KpiConfig catalog={noDateCatalog} value={{ measure: 'amount', aggregation: 'sum', comparisonEnabled: true }} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('combobox', { name: 'Show' })).toBeNull();
  });
});
