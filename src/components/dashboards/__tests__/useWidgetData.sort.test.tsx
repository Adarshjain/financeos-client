import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { useWidgetData } from '@/components/dashboards/useWidgetData';
import { api } from '@/lib/api/client';
import { builtinWidgetQueryParams, widgetQueryParams } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import type { SortClause } from '@/lib/reports.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const layout = { x: 0, y: 0, w: 4, h: 3 };
const tableData = { type: 'TABLE', mode: 'raw', columns: [], rows: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 } };
const reportWidget = (type = 'TABLE'): WidgetResponse => ({
  id: 'w2', kind: 'report', reportId: 'rep-1', layout, report: { name: 'R', type, available: true },
} as WidgetResponse);
const builtinTable: WidgetResponse = {
  id: 'w1', kind: 'builtin', builtinKey: 'upcoming', params: { days: 14 }, layout,
  builtin: { key: 'upcoming', label: 'Upcoming', kind: 'template', templateType: 'TABLE' },
} as WidgetResponse;
const sort: SortClause = { key: 'dueDate', direction: 'desc' };

const run = (w: WidgetResponse, s: SortClause | null) => {
  const qc = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  renderHook(() => useWidgetData(w, 1, 20, s), { wrapper: Wrapper });
  return qc;
};

describe('useWidgetData runtime sort', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: tableData } as never);
  });

  it('sends sort=key,dir for a table report and keys the cache with it', async () => {
    const qc = run(reportWidget(), sort);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/data', {
      params: { path: { id: 'rep-1' }, query: { page: 1, size: 20, sort: 'dueDate,desc' } },
    }));
    await waitFor(() => expect(qc.getQueryData(keys.dashboards.widget('w2', widgetQueryParams('rep-1', true, 1, 20, sort)))).toEqual(tableData));
  });

  it('sends sort=key,dir for a table built-in and keys the cache with it', async () => {
    const qc = run(builtinTable, sort);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/data', {
      params: { path: { key: 'upcoming' }, query: { page: 1, size: 20, sort: 'dueDate,desc' } },
      body: { params: { days: 14 } },
    }));
    await waitFor(() =>
      expect(qc.getQueryData(keys.dashboards.widget('w1', builtinWidgetQueryParams('upcoming', { days: 14 }, true, 1, 20, sort)))).toEqual(tableData),
    );
  });

  it('omits sort from the request and the key when it is null (prefetch-identical key)', async () => {
    const qc = run(reportWidget(), null);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/data', {
      params: { path: { id: 'rep-1' }, query: { page: 1, size: 20 } },
    }));
    await waitFor(() => expect(qc.getQueryData(keys.dashboards.widget('w2', widgetQueryParams('rep-1', true, 1, 20)))).toEqual(tableData));
  });

  it('never sends a sort for a non-table report', async () => {
    run(reportWidget('KPI'), sort);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/data', {
      params: { path: { id: 'rep-1' }, query: {} },
    }));
  });
});
