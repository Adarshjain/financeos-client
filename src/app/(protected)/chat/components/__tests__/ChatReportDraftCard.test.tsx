import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as reportsActions from '@/actions/reports';

import {
  ChatReportDraft,
  ChatReportDraftCard,
} from '../ChatReportDraftCard';

vi.mock('@/actions/reports', () => ({
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  runAdHocReport: vi.fn(),
}));

vi.mock('@/components/reports/views/ReportDataView', () => ({
  ReportDataView: ({ data }: { data: unknown }) => (
    <div data-testid="report-data-view">{JSON.stringify(data)}</div>
  ),
}));

describe('ChatReportDraftCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create mode: loads preview, renders report view, and saves report on button click', async () => {
    vi.mocked(reportsActions.runAdHocReport).mockResolvedValue({
      success: true,
      data: {
        type: 'KPI',
        value: 42000,
        measure: 'amount',
        aggregation: 'sum',
        comparison: null,
        meta: { rowCount: 10, dateRange: null },
      },
    });

    vi.mocked(reportsActions.createReport).mockResolvedValue({
      success: true,
      data: {
        id: 'new-report-id-123',
        name: 'Total Spend KPI',
        description: 'Monthly spend metric',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
        createdAt: '2026-08-26T00:00:00Z',
        updatedAt: '2026-08-26T00:00:00Z',
      },
    });

    const onStateChange = vi.fn();
    const draft: ChatReportDraft = {
      mode: 'create',
      name: 'Total Spend KPI',
      description: 'Monthly spend metric',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    };

    render(
      <ChatReportDraftCard draft={draft} onStateChange={onStateChange} />,
    );

    expect(screen.getByText('Total Spend KPI')).toBeInTheDocument();
    expect(screen.getByText('Monthly spend metric')).toBeInTheDocument();
    expect(screen.getByText('KPI')).toBeInTheDocument();

    await waitFor(() => {
      expect(reportsActions.runAdHocReport).toHaveBeenCalledWith({
        type: 'KPI',
        datasource: 'transactions',
        definition: draft.definition,
      });
      expect(screen.getByTestId('report-data-view')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save report/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(reportsActions.createReport).toHaveBeenCalledWith({
        name: 'Total Spend KPI',
        description: 'Monthly spend metric',
        type: 'KPI',
        datasource: 'transactions',
        definition: draft.definition,
      });
      expect(onStateChange).toHaveBeenCalledWith({
        status: 'saved',
        savedReportId: 'new-report-id-123',
      });
    });
  });

  it('create mode: preview failure disables Save button and displays error message', async () => {
    vi.mocked(reportsActions.runAdHocReport).mockResolvedValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid filter operator for date field',
        timestamp: '2026-08-26T00:00:00Z',
      },
    });

    const onStateChange = vi.fn();
    const draft: ChatReportDraft = {
      mode: 'create',
      name: 'Bad Date Report',
      type: 'CHART',
      datasource: 'transactions',
      definition: { chartType: 'bar' },
    };

    render(
      <ChatReportDraftCard draft={draft} onStateChange={onStateChange} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Invalid filter operator for date field'),
      ).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save report/i });
    expect(saveButton).toBeDisabled();
  });

  it('update mode: calls updateReport and fires updated status', async () => {
    vi.mocked(reportsActions.runAdHocReport).mockResolvedValue({
      success: true,
      data: {
        type: 'CHART',
        chartType: 'bar',
        dimension: 'date',
        categories: ['Jan', 'Feb'],
        series: [{ name: 'Spend', data: [100, 200] }],
        measure: { field: 'amount', aggregation: 'sum' },
        meta: { rowCount: 2, dateRange: null },
      },
    });

    const chartDef = {
      chartType: 'bar' as const,
      dimension: { field: 'date' },
      measure: { field: 'amount', aggregation: 'sum' as const },
      filters: [],
    };

    vi.mocked(reportsActions.updateReport).mockResolvedValue({
      success: true,
      data: {
        id: 'report-uuid-999',
        name: 'Updated Chart',
        description: null,
        type: 'CHART',
        datasource: 'transactions',
        definition: chartDef,
        createdAt: '2026-08-26T00:00:00Z',
        updatedAt: '2026-08-26T00:00:00Z',
      },
    });

    const onStateChange = vi.fn();
    const draft: ChatReportDraft = {
      mode: 'update',
      reportId: 'report-uuid-999',
      name: 'Updated Chart',
      type: 'CHART',
      datasource: 'transactions',
      definition: chartDef,
    };

    render(
      <ChatReportDraftCard draft={draft} onStateChange={onStateChange} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-data-view')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', {
      name: /update report/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(reportsActions.updateReport).toHaveBeenCalledWith(
        'report-uuid-999',
        {
          name: 'Updated Chart',
          description: null,
          definition: chartDef,
        },
      );
      expect(onStateChange).toHaveBeenCalledWith({
        status: 'updated',
        savedReportId: 'report-uuid-999',
      });
    });
  });

  it('delete mode: two-step confirmation prevents accidental deletion and executes on second click', async () => {
    vi.mocked(reportsActions.deleteReport).mockResolvedValue({
      success: true,
      data: undefined,
    });

    const onStateChange = vi.fn();
    const draft: ChatReportDraft = {
      mode: 'delete',
      reportId: 'delete-target-id',
      name: 'Obsolete Report',
    };

    render(
      <ChatReportDraftCard draft={draft} onStateChange={onStateChange} />,
    );

    // Live preview must not be called in delete mode
    expect(reportsActions.runAdHocReport).not.toHaveBeenCalled();

    expect(screen.getByText('DELETE')).toBeInTheDocument();
    expect(
      screen.getByText(/This will permanently delete the report/i),
    ).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete report' });

    // 1st click arms the button
    fireEvent.click(deleteBtn);
    expect(reportsActions.deleteReport).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Click again to delete' }),
    ).toBeInTheDocument();

    // 2nd click executes deletion
    fireEvent.click(
      screen.getByRole('button', { name: 'Click again to delete' }),
    );

    await waitFor(() => {
      expect(reportsActions.deleteReport).toHaveBeenCalledWith(
        'delete-target-id',
      );
      expect(onStateChange).toHaveBeenCalledWith({
        status: 'deleted',
        savedReportId: 'delete-target-id',
      });
    });
  });

  it('terminal states: render confirmation banner and View report link with no action buttons', () => {
    const onStateChange = vi.fn();
    const draft: ChatReportDraft = {
      mode: 'create',
      name: 'Saved Report',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount' },
      status: 'saved',
      savedReportId: 'saved-12345',
    };

    render(
      <ChatReportDraftCard draft={draft} onStateChange={onStateChange} />,
    );

    expect(screen.getByText('Saved ✓')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'View report' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/reports/saved-12345');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('failed state: displays error message and preserves retryable action button', () => {
    const onStateChange = vi.fn();
    const draft: ChatReportDraft = {
      mode: 'create',
      name: 'Retryable Report',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount' },
      status: 'failed',
      errorMessage: 'Network error saving report',
    };

    render(
      <ChatReportDraftCard draft={draft} onStateChange={onStateChange} />,
    );

    expect(
      screen.getByText('Network error saving report'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save report/i }),
    ).toBeInTheDocument();
  });

  it('defensive rendering: missing required fields for mode returns null', () => {
    const onStateChange = vi.fn();

    // Missing definition for create mode
    const { container: c1 } = render(
      <ChatReportDraftCard
        draft={{
          mode: 'create',
          name: 'Incomplete',
          type: 'KPI',
          datasource: 'transactions',
        }}
        onStateChange={onStateChange}
      />,
    );
    expect(c1.firstChild).toBeNull();

    // Missing reportId for delete mode
    const { container: c2 } = render(
      <ChatReportDraftCard
        draft={{ mode: 'delete', name: 'No ID' }}
        onStateChange={onStateChange}
      />,
    );
    expect(c2.firstChild).toBeNull();
  });
});
