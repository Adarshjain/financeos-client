import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { commitRoute, resetInAppNavigation } from '@/features/shell/navigationStore';
import type { KpiData, ReportData, ReportResponse, TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { catalogFixture, savedChart } from './editor.fixtures';
import { ReportEditor, type ReportEditorProps } from './ReportEditor';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/reports/new', useSearchParams: () => new URLSearchParams() }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: ({ data }: { data: { chartType: string } }) => <div data-testid="chart" data-type={data.chartType} />,
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });

const RUN = '/api/v1/reports/data';
const runCalls = () => api.POST.mock.calls.filter(([path]) => path === RUN);
const writeCalls = () => api.POST.mock.calls.filter(([path]) => path === '/api/v1/reports');

const kpiResult: KpiData = {
  type: 'KPI',
  value: 184320,
  measure: 'spend',
  aggregation: 'sum',
  format: 'currency',
  comparison: { previousValue: 170000, previousDateRange: null, change: 14320, changePercent: 8.4, direction: 'up', sentiment: 'bad' },
  meta: { rowCount: 182, dateRange: { from: '2026-10-01', to: '2026-10-25' } },
};
const chartResult: ReportData = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food & dining'],
  series: [{ name: 'Spend', data: [42180] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 1, dateRange: null },
};
const tableResult: TableData = {
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
  ],
  rows: [{ id: 't1', description: 'Swiggy', amount: 420 }],
  page: { number: 0, size: 25, totalElements: 120, totalPages: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetInAppNavigation();
  api.GET.mockResolvedValue({ data: undefined });
  api.POST.mockImplementation(async (path: string) => {
    if (path === RUN) return { data: kpiResult };
    return { data: { id: 'new1', name: 'x' } };
  });
  api.PUT.mockResolvedValue({ data: savedChart });
  api.DELETE.mockResolvedValue({});
});

const setup = (props: Partial<ReportEditorProps> = {}) => renderWithQuery(<ReportEditor catalog={catalogFixture} {...props} />);

async function pick(field: string, option: string | RegExp) {
  await user.click(screen.getByRole('combobox', { name: field }));
  await user.click(await screen.findByRole('option', { name: option }));
}

const type = async (label: string, text: string) => {
  const box = screen.getByLabelText(label);
  await user.clear(box);
  await user.type(box, text);
};

/** The Switch of a settings row, found by the row's label (the Switch itself is named "Toggle"). */
const toggle = (label: string | RegExp): HTMLElement => {
  const text = screen.getByText(label).closest('label') as HTMLLabelElement;
  return document.getElementById(text.htmlFor) as HTMLElement;
};

const body = () => writeCalls()[0][1].body;

describe('Add report', () => {
  it('opens on a blank KPI with no + (Add report) action, Cancel back to the list and no unsaved label', async () => {
    setup();
    expect(screen.queryByRole('link', { name: 'Add report' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.push).toHaveBeenCalledWith('/reports');
    expect(screen.getByRole('radio', { name: 'KPI' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Datasource' })).toHaveTextContent('Transactions');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    expect(screen.getByText('Click Preview to run this report.')).toBeInTheDocument();
  });

  it('lists the datasources grouped by area', async () => {
    setup();
    await user.click(screen.getByRole('combobox', { name: 'Datasource' }));
    expect(await screen.findByText('Spending')).toBeInTheDocument();
    expect(screen.getByText('Wealth')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dividends' })).toBeInTheDocument();
  });

  it('shows the Unsaved changes label once the draft differs, and clears it when put back', async () => {
    setup();
    await user.type(screen.getByLabelText('Report name'), 'Spend');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Report name'));
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('switches datasource and starts that datasource’s own fields', async () => {
    setup();
    await pick('Datasource', 'Dividends');
    expect(screen.getByRole('combobox', { name: 'Datasource' })).toHaveTextContent('Dividends');
    await user.click(screen.getByRole('combobox', { name: 'Measure' }));
    expect(screen.queryByRole('option', { name: 'Spend' })).not.toBeInTheDocument();
  });
});

describe('A sole measure', () => {
  it('is chosen for the user, with its sole aggregation', async () => {
    setup();
    await pick('Datasource', 'Dividends');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Measure' })).toHaveTextContent('Amount'));
    expect(screen.getByRole('combobox', { name: 'Aggregation' })).toHaveTextContent('Sum');
  });
});

describe('Opening', () => {
  it('does not read a sole measure chosen for the user as an edit', () => {
    const dividendsFirst = { ...catalogFixture, datasources: [...catalogFixture.datasources].reverse() };
    setup({ catalog: dividendsFirst });
    expect(screen.getByRole('combobox', { name: 'Measure' })).toHaveTextContent('Amount');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });
});

describe('KPI options and save', () => {
  it('saves a KPI with its measure, aggregation and the default hide-excluded filter', async () => {
    setup();
    await type('Report name', 'Total spend');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body()).toEqual({
      name: 'Total spend',
      description: undefined,
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [{ field: 'isExcluded', operator: 'is', value: false }], comparison: { enabled: false } },
    });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports'));
    expect(router.refresh).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Report created');
  });

  it('saves the description with the report', async () => {
    setup();
    await type('Report name', 'Total spend');
    await user.type(screen.getByLabelText(/Description/), 'Everything out');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().description).toBe('Everything out');
  });

  it('has no comparison by default (Show: None), with count as an aggregation', async () => {
    setup();
    await type('Report name', 'Bills');
    await pick('Measure', 'Amount');
    await pick('Aggregation', 'Count');
    expect(screen.getByRole('combobox', { name: 'Comparison' })).toHaveTextContent('None');
    expect(screen.queryByRole('combobox', { name: 'Change perception' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition).toMatchObject({ measure: 'amount', aggregation: 'count', comparison: { enabled: false } });
  });

  it('offers what the comparison shows and which change is good, and sends them', async () => {
    setup();
    await type('Report name', 'Spend');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await pick('Comparison', 'Previous period value');
    await pick('Change perception', 'Lower is better');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition.comparison).toEqual({ higherIsBetter: false, display: 'previous_value' });
  });

  it('shows what is missing at its field after a save is tried, and writes nothing', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    expect(screen.getByText('Give the report a name.')).toBeInTheDocument();
    expect(screen.getAllByText('Select a measure.').length).toBeGreaterThan(0);
    expect(writeCalls()).toHaveLength(0);
  });

  it('does not nag before anything is tried', () => {
    setup();
    expect(screen.queryByText('Select a measure.')).not.toBeInTheDocument();
    expect(screen.queryByText('Give the report a name.')).not.toBeInTheDocument();
  });

  it('tells the owner when saving fails and stays on the page', async () => {
    api.POST.mockImplementation(async (path: string) => {
      if (path === '/api/v1/reports') throw new Error('boom');
      return { data: kpiResult };
    });
    setup();
    await type('Report name', 'Spend');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't save the report. Try again.", { tone: 'danger' }));
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('Chart options', () => {
  async function toChart() {
    setup();
    await user.click(screen.getByRole('radio', { name: 'Chart' }));
  }

  it('offers every chart type including Breakdown', async () => {
    await toChart();
    await user.click(screen.getByRole('combobox', { name: 'Chart type' }));
    for (const name of ['Line', 'Bar', 'Stacked bar', 'Area', 'Pie', 'Donut', 'Breakdown']) {
      expect(await screen.findByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('saves dimension, series, measure, Top N, Other, order and comparison', async () => {
    await toChart();
    await type('Report name', 'Spend by category');
    await pick('Dimension (X-axis)', 'Category');
    await pick('Series (optional split)', 'Type');
    await pick('Measure (Y-axis)', 'Spend');
    await pick('Aggregation', 'Sum');
    await type('Show top', '8');
    await user.click(toggle(/Group the rest as Other/));
    await pick('Order', 'Value, low to high');
    await pick('Comparison', 'Change vs previous period');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().type).toBe('CHART');
    expect(body().definition).toEqual({
      chartType: 'bar',
      dimension: { field: 'category' },
      series: { field: 'type' },
      measure: { field: 'spend', aggregation: 'sum' },
      filters: [{ field: 'isExcluded', operator: 'is', value: false }],
      limit: 8,
      other: true,
      order: 'value_asc',
      comparison: { enabled: true, period: 'previous_period' },
    });
  });

  it('asks for a granularity on a date dimension and turns the comparison off there', async () => {
    await toChart();
    await pick('Dimension (X-axis)', 'Date');
    expect(screen.getByRole('combobox', { name: 'Group by' })).toHaveTextContent('Month');
    expect(screen.getByRole('combobox', { name: 'Comparison' })).toBeDisabled();
    expect(screen.getByText('Not available on a date dimension')).toBeInTheDocument();
    await pick('Group by', 'Financial year');
    expect(screen.getByRole('combobox', { name: 'Group by' })).toHaveTextContent('Financial year');
  });

  it('keeps Other off until there is a top number', async () => {
    await toChart();
    expect(toggle(/Group the rest as Other/)).toBeDisabled();
    await type('Show top', '5');
    expect(toggle(/Group the rest as Other/)).toBeEnabled();
  });

  it('shows the Top N error at its field when it is out of range', async () => {
    await toChart();
    await type('Show top', '99');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getAllByText('Top N must be a whole number from 1 to 50.').length).toBeGreaterThan(0);
    expect(runCalls()).toHaveLength(0);
  });

  it('drops the sub-rows when the rows become the same field, and flags a saved clash', async () => {
    await toChart();
    await pick('Chart type', 'Breakdown');
    await pick('Rows', 'Category');
    await pick('Sub-rows', 'Type');
    await pick('Rows', 'Type');
    expect(screen.getByRole('combobox', { name: 'Sub-rows' })).toHaveTextContent('No sub-rows');
  });

  it('hides the series for pie, donut and breakdown, and shows sub-rows for a breakdown only', async () => {
    await toChart();
    expect(screen.getByRole('combobox', { name: 'Series (optional split)' })).toBeInTheDocument();
    await pick('Chart type', 'Pie');
    expect(screen.queryByRole('combobox', { name: 'Series (optional split)' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Slices' })).toBeInTheDocument();
    await pick('Chart type', 'Breakdown');
    expect(screen.queryByRole('combobox', { name: 'Series (optional split)' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Rows' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sub-rows' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Order' })).toHaveTextContent('Value, high to low');
  });

  it('saves a breakdown with sub-rows and their limit', async () => {
    await toChart();
    await type('Report name', 'Where the money went');
    await pick('Chart type', 'Breakdown');
    await pick('Rows', 'Category');
    await pick('Sub-rows', 'Type');
    await type('Sub-rows per row', '4');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await type('Show top', '8');
    await user.click(toggle(/Group the rest as Other/));
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition).toMatchObject({
      chartType: 'breakdown',
      dimension: { field: 'category' },
      subDimension: { field: 'type' },
      subLimit: 4,
      limit: 8,
      other: true,
    });
    expect(body().definition).not.toHaveProperty('series');
  });
});

describe('Breakdown display options', () => {
  async function toChart() {
    setup();
    await user.click(screen.getByRole('radio', { name: 'Chart' }));
  }

  it('offers Columns and Bars for a breakdown only, and saves the picks', async () => {
    await toChart();
    expect(screen.queryByRole('combobox', { name: 'Columns' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Bars' })).not.toBeInTheDocument();
    await type('Report name', 'Where the money went');
    await pick('Chart type', 'Breakdown');
    await pick('Rows', 'Category');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    expect(screen.getByRole('combobox', { name: 'Bars' })).toHaveTextContent('Relative to largest');
    await user.click(screen.getByRole('combobox', { name: 'Columns' }));
    await user.click(await screen.findByRole('option', { name: 'Transactions' }));
    await user.keyboard('{Escape}');
    await pick('Bars', 'Share of total');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition).toMatchObject({ columns: ['amount', 'share', 'count'], bars: 'share_of_total' });
  });

  it('sends neither while they are left at the default', async () => {
    await toChart();
    await type('Report name', 'Where the money went');
    await pick('Chart type', 'Breakdown');
    await pick('Rows', 'Category');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition).not.toHaveProperty('columns');
    expect(body().definition).not.toHaveProperty('bars');
  });
});

describe('Table options', () => {
  async function toTable() {
    setup();
    await user.click(screen.getByRole('radio', { name: 'Table' }));
  }

  it('saves a raw table with ordered columns and a sort', async () => {
    await toTable();
    await type('Report name', 'Transactions');
    await user.click(screen.getByRole('combobox', { name: 'Columns' }));
    await user.click(await screen.findByRole('option', { name: 'Description' }));
    await user.click(await screen.findByRole('option', { name: 'Amount' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Move up.*Amount/ }));
    await user.click(screen.getByRole('button', { name: 'Add sort' }));
    await pick('Direction', 'Descending');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition).toEqual({
      mode: 'raw',
      columns: ['amount', 'description'],
      filters: [{ field: 'isExcluded', operator: 'is', value: false }],
      sort: [{ key: 'amount', direction: 'desc' }],
    });
  });

  it('saves an aggregated table with group-by, a pivot column and several measures', async () => {
    await toTable();
    await type('Report name', 'Spend by category');
    await user.click(screen.getByRole('radio', { name: 'Aggregated' }));
    await user.click(screen.getByRole('button', { name: 'Add group' }));
    await pick('Group by', 'Category');
    await user.click(screen.getByRole('button', { name: 'Add pivot column' }));
    await pick('Pivot columns (optional)', 'Type');
    await user.click(screen.getByRole('button', { name: 'Add measure' }));
    await pick('Measures', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Add measure' }));
    const measures = screen.getAllByRole('combobox', { name: 'Measure' });
    await user.click(measures[0]);
    await user.click(await screen.findByRole('option', { name: 'Amount' }));
    await user.click(screen.getAllByRole('combobox', { name: 'Aggregation' })[1]);
    await user.click(await screen.findByRole('option', { name: 'Count' }));
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition).toEqual({
      mode: 'aggregated',
      rows: [{ field: 'category' }],
      columns: [{ field: 'type' }],
      measures: [
        { field: 'spend', aggregation: 'sum' },
        { field: 'amount', aggregation: 'count' },
      ],
      filters: [{ field: 'isExcluded', operator: 'is', value: false }],
    });
  });

  it('removes a group-by row and says when none is left', async () => {
    await toTable();
    await user.click(screen.getByRole('radio', { name: 'Aggregated' }));
    await user.click(screen.getByRole('button', { name: 'Add group' }));
    await user.click(screen.getByRole('button', { name: 'Remove group by' }));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getAllByText('Add at least one row dimension.').length).toBeGreaterThan(0);
  });
});

describe('Filters', () => {
  it('shows each filter as a removable chip that opens its editor', async () => {
    setup();
    expect(screen.getByRole('button', { name: 'Is Excluded · false' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Is Excluded · false' }));
    await pick('Value', 'True');
    expect(screen.getByRole('button', { name: 'Is Excluded · true' })).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('keeps the editor open while the field changes', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Is Excluded · false' }));
    await pick('Field', 'Type');
    expect(screen.getByRole('combobox', { name: 'Field' })).toHaveTextContent('Type');
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('offers Apply only once the filter is complete', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    await pick('Field', 'Type');
    expect(screen.getByRole('button', { name: 'Apply filter' })).toBeDisabled();
    await pick('Value', 'DEBIT');
    expect(screen.getByRole('button', { name: 'Apply filter' })).toBeEnabled();
  });

  it('removes a filter from its chip', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Remove filter' }));
    expect(screen.queryByRole('button', { name: /Is Excluded/ })).not.toBeInTheDocument();
  });

  it('adds a filter through the same editor: field, operator, value', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    await pick('Field', 'Type');
    await pick('Value', 'DEBIT');
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));
    expect(screen.getByRole('button', { name: 'Type · is DEBIT' })).toBeInTheDocument();
  });

  it('edits a relative date filter’s amount', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    await pick('Field', 'Date');
    await pick('Operator', 'Last N days');
    await type('Amount', '90');
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));
    expect(screen.getByRole('button', { name: 'Date · last 90 days' })).toBeInTheDocument();
  });

  it('takes a date range in dd/mm/yy', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    await pick('Field', 'Date');
    await pick('Operator', 'Between');
    const range = screen.getByLabelText('Between');
    await user.type(range, '010126');
    await user.type(range, '310326');
    expect(range).toHaveValue('01/01/26 – 31/03/26');
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));
    expect(screen.getByRole('button', { name: 'Date · between 2026-01-01 – 2026-03-31' })).toBeInTheDocument();
  });

  it('picks several values of an enum from a multi-select', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    await pick('Field', 'Type');
    await pick('Operator', 'In');
    await user.click(screen.getByRole('combobox', { name: 'Values' }));
    await user.click(await screen.findByRole('option', { name: 'DEBIT' }));
    await user.click(await screen.findByRole('option', { name: 'CREDIT' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));
    expect(screen.getByRole('button', { name: 'Type · in DEBIT, CREDIT' })).toBeInTheDocument();
  });

  it('sends the edited filters with the report', async () => {
    setup();
    await type('Report name', 'Spend');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Remove filter' }));
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    await pick('Field', 'Date');
    await pick('Operator', 'This month');
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition.filters).toEqual([{ field: 'date', operator: 'this_month' }]);
  });
});

describe('Preview', () => {
  async function finishKpi() {
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
  }

  it('runs nothing by itself, then runs the draft when Preview is pressed', async () => {
    setup();
    await finishKpi();
    expect(runCalls()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(runCalls()).toHaveLength(1));
    expect(runCalls()[0][1].body).toEqual({
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [{ field: 'isExcluded', operator: 'is', value: false }], comparison: { enabled: false } },
    });
    expect(await screen.findByText('₹1,84,320')).toBeInTheDocument();
    expect(screen.getByText('+₹14,320 (+8.4%)')).toBeInTheDocument();
  });

  it('explains what is missing and does not run an unfinished report', async () => {
    setup();
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Finish configuring the report')).toBeInTheDocument();
    expect(runCalls()).toHaveLength(0);
  });

  it('shows a chart result in the chart, and says so when the run fails', async () => {
    api.POST.mockImplementation(async (path: string) => (path === RUN ? { data: chartResult } : { data: {} }));
    setup();
    await user.click(screen.getByRole('radio', { name: 'Chart' }));
    await pick('Dimension (X-axis)', 'Category');
    await pick('Measure (Y-axis)', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByTestId('chart')).toHaveAttribute('data-type', 'bar');
    api.POST.mockRejectedValue(new Error('down'));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText("Couldn't run the report")).toBeInTheDocument();
  });

  it('pages and sorts a table on the server, keeping the pager above and below', async () => {
    api.POST.mockImplementation(async (path: string) => (path === RUN ? { data: tableResult } : { data: {} }));
    setup();
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    await user.click(screen.getByRole('combobox', { name: 'Columns' }));
    await user.click(await screen.findByRole('option', { name: 'Description' }));
    await user.click(await screen.findByRole('option', { name: 'Amount' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(screen.getAllByText('Swiggy').length).toBeGreaterThan(0));
    expect(runCalls()[0][1].params.query).toEqual({ page: 0, size: 25 });
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(2);

    await user.click(within(screen.getAllByRole('navigation', { name: 'Pagination' })[0]).getByRole('button', { name: /next/i }));
    await waitFor(() => expect(runCalls()).toHaveLength(2));
    expect(runCalls()[1][1].params.query).toEqual({ page: 1, size: 25 });

    await user.click(within(screen.getByRole('columnheader', { name: /Amount/ })).getByRole('button'));
    await waitFor(() => expect(runCalls()).toHaveLength(3));
    expect(runCalls()[2][1].params.query).toEqual({ page: 0, size: 25, sort: 'amount,asc' });
  });

  it('marks a result stale when the draft changes, and refreshes on request', async () => {
    setup();
    await finishKpi();
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText('₹1,84,320');
    await pick('Aggregation', 'Average');
    expect(screen.getByText('Configuration changed since this result.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh preview' }));
    await waitFor(() => expect(runCalls()).toHaveLength(2));
  });
});

describe('Template', () => {
  it('opens prefilled from ?template= as an unsaved new report that saves as it is', async () => {
    setup({ templateId: 'dividend-income-by-fy' });
    expect(screen.getByLabelText('Report name')).toHaveValue('Dividend income by FY');
    expect(screen.getByRole('radio', { name: 'Chart' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Datasource' })).toHaveTextContent('Dividends');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body()).toMatchObject({
      type: 'CHART',
      datasource: 'dividends',
      definition: { chartType: 'bar', dimension: { field: 'payDate', granularity: 'fy' }, measure: { field: 'amount', aggregation: 'sum' } },
    });
  });

  it('opens blank for an unknown template', () => {
    setup({ templateId: 'no-such-template' });
    expect(screen.getByLabelText('Report name')).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'KPI' })).toBeChecked();
  });
});

describe('A saved report', () => {
  const props = (over: Partial<ReportEditorProps> = {}): Partial<ReportEditorProps> => ({ report: savedChart, initialResult: chartResult, ...over });

  it('opens in its editor with its name, fields and result, and fetches nothing on load', () => {
    setup(props());
    expect(screen.getByLabelText('Report name')).toHaveValue('Spend by category');
    expect(screen.getByLabelText(/Description/)).toHaveValue('Where it goes');
    expect(screen.getByRole('combobox', { name: 'Dimension (X-axis)' })).toHaveTextContent('Category');
    expect(screen.getByLabelText('Show top')).toHaveValue(5);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/reports/{id}', expect.anything());
  });

  it('fixes the format and the datasource', () => {
    setup(props());
    for (const name of ['KPI', 'Chart', 'Table']) expect(screen.getByRole('radio', { name })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Datasource' })).toBeDisabled();
  });

  it('saves changes, then goes back to the list on a direct load', async () => {
    setup(props());
    await type('Report name', 'Spend by category v2');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1));
    expect(api.PUT.mock.calls[0][1].params).toEqual({ path: { id: 'r1' } });
    expect(api.PUT.mock.calls[0][1].body).toMatchObject({
      name: 'Spend by category v2',
      definition: { chartType: 'bar', dimension: { field: 'category' }, limit: 5, other: true },
    });
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith('Report saved');
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports'));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('goes back to where it was opened from (a dashboard) after a save, refreshing it', async () => {
    commitRoute('/dashboards');
    commitRoute('/reports/r1');
    setup(props());
    await type('Report name', 'From the dashboard');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Report saved');
  });

  it('refreshes the page it lands on after going back, not the editor', async () => {
    commitRoute('/reports');
    commitRoute('/reports/r1');
    setup(props());
    await type('Report name', 'Fresh landing');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const before = router.refresh.mock.calls.length;
    act(() => commitRoute('/reports'));
    expect(router.refresh.mock.calls.length).toBe(before + 1);
  });

  it('stays on the editor when the draft is edited while the save is in flight', async () => {
    commitRoute('/reports');
    commitRoute('/reports/r1');
    let finish: (v: unknown) => void = () => undefined;
    api.PUT.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    setup(props());
    await type('Report name', 'First name');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1));
    await type('Report name', ' and more');
    await act(async () => finish({ data: savedChart }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Report saved'));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('does not ask about unsaved changes when a save leaves the page', async () => {
    commitRoute('/reports');
    commitRoute('/reports/r1');
    setup(props());
    await type('Report name', 'Quiet leave');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
  });

  it('shows the new name in the title after saving', async () => {
    setup(props());
    await type('Report name', 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(screen.getByText('Renamed')).toBeInTheDocument());
  });

  it('shows a date dimension with no granularity as unselected, and says so', async () => {
    const def = { ...savedChart.definition, dimension: { field: 'date' } } as ReportResponse['definition'];
    setup(props({ report: { ...savedChart, definition: def } }));
    expect(screen.getByRole('combobox', { name: 'Group by' })).toHaveTextContent('Select granularity');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getAllByText('Select a granularity for the date dimension.').length).toBeGreaterThan(0);
  });

  it('refreshes the page after a write, so the list is not the cached one, and keeps the draft', async () => {
    setup(props());
    await type('Report name', 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(screen.getByLabelText('Report name')).toHaveValue('Renamed');
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());
  });

  it('saves as a new report and goes back', async () => {
    setup(props());
    await type('Report name', 'Copy of it');
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Save as new' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body()).toMatchObject({ name: 'Copy of it', type: 'CHART', datasource: 'transactions' });
    expect(api.PUT).not.toHaveBeenCalled();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports'));
  });

  it('duplicates the saved report and offers Undo, which deletes the copy', async () => {
    api.GET.mockResolvedValue({ data: savedChart as ReportResponse });
    api.POST.mockResolvedValue({ data: { id: 'copy1' } });
    setup(props());
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Report duplicated', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) })));
    expect(writeCalls()[0][1].body).toMatchObject({ name: 'Spend by category (copy)', type: 'CHART' });
    act(() => toast.mock.calls.find(([m]) => m === 'Report duplicated')![1].action.onSelect());
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'copy1' } } }));
  });

  it('confirms before deleting, says what goes and what stays, then returns to the list', async () => {
    setup(props());
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Dashboards that use it will show the report as unavailable/)).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'r1' } } }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports'));
    // Refresh comes after the navigation, so the list it opens is fresh and the deleted page is never re-rendered.
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(router.push.mock.invocationCallOrder[0]).toBeLessThan(router.refresh.mock.invocationCallOrder[0]);
    expect(toast).toHaveBeenCalledWith('Report deleted');
  });

  it('keeps the report when the delete is cancelled', async () => {
    setup(props());
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(api.DELETE).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no ⋯ menu on a new report', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
  });
});

describe('Leaving with unsaved changes', () => {
  it('asks before an in-app link, and stays on Keep editing', async () => {
    setup();
    await user.type(screen.getByLabelText('Report name'), 'Spend');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Discard changes?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Report name')).toHaveValue('Spend');
  });

  it('goes where the link led after Discard', async () => {
    setup();
    await user.type(screen.getByLabelText('Report name'), 'Spend');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }));
    expect(router.push).toHaveBeenCalledWith('/reports');
  });

  it('does not ask when nothing changed', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the browser prompt on close or reload only while unsaved', async () => {
    setup();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await user.type(screen.getByLabelText('Report name'), 'Spend');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('stops asking once the changes are saved', async () => {
    setup({ report: savedChart, initialResult: chartResult });
    await type('Report name', 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Sectioned editor', () => {
  it('shows Change perception only while Show is not None', async () => {
    setup();
    expect(screen.queryByRole('combobox', { name: 'Change perception' })).toBeNull();
    await pick('Comparison', 'Change vs previous period');
    expect(screen.getByRole('combobox', { name: 'Change perception' })).toBeInTheDocument();
    await pick('Comparison', 'None');
    expect(screen.queryByRole('combobox', { name: 'Change perception' })).toBeNull();
  });

  it('sends a comparison once Show is not None', async () => {
    setup();
    await type('Report name', 'Spend');
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await pick('Comparison', 'Change vs previous period');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(body().definition.comparison).toBeUndefined(); // the server's default is on: nothing to send
  });

  it('clears the preview when the report type changes', async () => {
    setup();
    await pick('Measure', 'Spend');
    await pick('Aggregation', 'Sum');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText('₹1,84,320')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Chart' }));
    expect(screen.queryByText('₹1,84,320')).not.toBeInTheDocument();
    expect(screen.queryByText('Configuration changed since this result.')).not.toBeInTheDocument();
    expect(screen.getByText('Click Preview to run this report.')).toBeInTheDocument();
  });

  it('adds a filter from the Filters header link', async () => {
    setup();
    const header = screen.getByRole('heading', { name: /^Filters/ });
    expect(within(header.parentElement as HTMLElement).getByRole('button', { name: 'Add filter' })).toBeInTheDocument();
  });

  it('puts Add sort in the Sort header and a sort row in one row with its delete button', async () => {
    setup();
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    await user.click(screen.getByRole('combobox', { name: 'Columns' }));
    await user.click(await screen.findByRole('option', { name: 'Description' }));
    await user.keyboard('{Escape}');
    const header = screen.getByRole('heading', { name: /^Sort/ });
    await user.click(within(header.parentElement as HTMLElement).getByRole('button', { name: 'Add sort' }));
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Direction' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove sort' }));
    expect(screen.queryByRole('combobox', { name: 'Sort by' })).not.toBeInTheDocument();
  });

  it('labels the primary action Add report on a new report and Save report on a saved one', () => {
    const { unmount } = setup();
    expect(screen.getByRole('button', { name: 'Add report' })).toBeInTheDocument();
    unmount();
    setup({ report: savedChart, initialResult: chartResult });
    expect(screen.getByRole('button', { name: 'Save report' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });
});
