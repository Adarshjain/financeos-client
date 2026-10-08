import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { useWidgetData } from '@/components/dashboards/useWidgetData';
import { api, ApiError } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const layout = { x: 0, y: 0, w: 4, h: 3 };
const tableData = { type: 'TABLE', mode: 'raw', columns: [], rows: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 } };
const builtinTemplate = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'w1', kind: 'builtin', builtinKey: 'upcoming', params: { days: 14 }, layout,
  builtin: { key: 'upcoming', label: 'Upcoming', kind: 'template', templateType: 'TABLE' },
  ...over,
} as WidgetResponse);
const reportWidget = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'w2', kind: 'report', reportId: 'rep-1', layout,
  report: { name: 'R', type: 'TABLE', available: true },
  ...over,
} as WidgetResponse);

const run = (w: WidgetResponse) => {
  const qc = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useWidgetData(w, 0, 20), { wrapper: Wrapper });
};
const apiError = (message: string) => new ApiError(500, { message } as never);

describe('useWidgetData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: tableData } as never);
  });

  describe('error text', () => {
    it('uses the server ApiError message for a built-in', async () => {
      vi.mocked(api.POST).mockRejectedValue(apiError('Boom from server'));
      const { result } = run(builtinTemplate());
      await waitFor(() => expect(result.current.error).toBe('Boom from server'));
    });

    it('uses the server ApiError message for a report widget', async () => {
      vi.mocked(api.POST).mockRejectedValue(apiError('Report broke'));
      const { result } = run(reportWidget());
      await waitFor(() => expect(result.current.error).toBe('Report broke'));
    });

    it('falls back to "Failed to load widget" for a non-ApiError built-in failure', async () => {
      vi.mocked(api.POST).mockRejectedValue(new Error('net'));
      const { result } = run(builtinTemplate());
      await waitFor(() => expect(result.current.error).toBe('Failed to load widget'));
    });

    it('falls back to "Failed to run report" for a non-ApiError report failure', async () => {
      vi.mocked(api.POST).mockRejectedValue(new Error('net'));
      const { result } = run(reportWidget());
      await waitFor(() => expect(result.current.error).toBe('Failed to run report'));
    });

    it('has no error on success', async () => {
      const { result } = run(builtinTemplate());
      await waitFor(() => expect(result.current.data).not.toBeNull());
      expect(result.current.error).toBeNull();
    });
  });

  describe('when fetching is enabled', () => {
    it('fetches an available template built-in with its key and declared params', async () => {
      const { result } = run(builtinTemplate());
      await waitFor(() => expect(api.POST).toHaveBeenCalled());
      expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/data', {
        params: { path: { key: 'upcoming' }, query: { page: 0, size: 20 } },
        body: { params: { days: 14 } },
      });
      expect(result.current).toMatchObject({ available: true, isBuiltin: true, isTemplate: true });
    });

    it('fetches an available report widget with a reportId', async () => {
      run(reportWidget());
      await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/data', {
        params: { path: { id: 'rep-1' }, query: { page: 0, size: 20 } },
      }));
    });

    it('does not paginate non-table built-ins', async () => {
      run(builtinTemplate({ builtin: { key: 'upcoming', label: 'U', kind: 'template', templateType: 'KPI' } as never }));
      await waitFor(() => expect(api.POST).toHaveBeenCalled());
      expect(vi.mocked(api.POST).mock.calls[0][1]).toMatchObject({ params: { query: {} } });
    });
  });

  describe('when fetching is disabled', () => {
    it('never fetches a component built-in (bills_due)', async () => {
      const w = builtinTemplate({ builtinKey: 'bills_due', builtin: { key: 'bills_due', label: 'Bills', kind: 'component' } as never });
      const { result } = run(w);
      await new Promise((r) => setTimeout(r, 20));
      expect(api.POST).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ available: true, isBuiltin: true, isTemplate: false, data: null });
    });

    it('never fetches an unavailable built-in (unknown key, builtin null)', async () => {
      const { result } = run(builtinTemplate({ builtin: null as never }));
      await new Promise((r) => setTimeout(r, 20));
      expect(api.POST).not.toHaveBeenCalled();
      expect(result.current.available).toBe(false);
    });

    it('never fetches a report widget without a reportId', async () => {
      const { result } = run(reportWidget({ reportId: null as never }));
      await new Promise((r) => setTimeout(r, 20));
      expect(api.POST).not.toHaveBeenCalled();
      expect(result.current.available).toBe(false);
    });

    it('never fetches a report widget whose report is unavailable', async () => {
      const { result } = run(reportWidget({ report: { name: 'R', type: 'TABLE', available: false } as never }));
      await new Promise((r) => setTimeout(r, 20));
      expect(api.POST).not.toHaveBeenCalled();
      expect(result.current.available).toBe(false);
    });
  });
});
