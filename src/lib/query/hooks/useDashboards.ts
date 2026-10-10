'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { DashboardResponse, UpdateDashboardRequest } from '@/lib/api/types';
import { toDashboardWidget } from '@/lib/dashboards.helpers';
import type { WidgetParams } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

export function useDashboards(initialData?: DashboardResponse[], { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.dashboards.list(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/dashboards');
      return data ?? [];
    },
    initialData,
    enabled,
  });
}

export function useDashboard(id: string, initialData?: DashboardResponse) {
  return useQuery({
    queryKey: keys.dashboards.byId(id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/dashboards/{id}', {
        params: { path: { id } },
      });
      return data ?? null;
    },
    enabled: Boolean(id),
    initialData,
  });
}

/**
 * POST /dashboards/home/restore — mints a fresh "Home" dashboard (the seeded
 * built-ins) and makes it the default. Invalidates every dashboards query.
 */
export function useRestoreHomeDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/dashboards/home/restore');
      return data as DashboardResponse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.dashboards.all }),
  });
}

/** What a widget-settings save needs: the dashboard as shown, the widget, and its new params. */
export interface WidgetParamsChange {
  dashboard: Pick<DashboardResponse, 'id' | 'name' | 'description' | 'isDefault' | 'widgets'>;
  widgetId: string;
  params: WidgetParams;
}

/**
 * Save one widget's params outside edit mode (Widget settings): PUT the
 * dashboard as shown with only that widget's params replaced. The detail and
 * list caches take the saved dashboard; the widget's data key carries its
 * params, so the widget refetches with the new ones.
 */
export function useSaveWidgetParams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dashboard, widgetId, params }: WidgetParamsChange) => {
      const widgets = dashboard.widgets.map((w) => (w.id === widgetId ? { ...w, params } : w));
      const body: UpdateDashboardRequest = {
        name: dashboard.name,
        description: dashboard.description?.trim() || undefined,
        isDefault: dashboard.isDefault,
        widgets: widgets.map(toDashboardWidget),
      };
      const { data } = await api.PUT('/api/v1/dashboards/{id}', { params: { path: { id: dashboard.id } }, body });
      return data as DashboardResponse;
    },
    onSuccess: (saved) => {
      qc.setQueryData(keys.dashboards.byId(saved.id), saved);
      qc.setQueryData<DashboardResponse[]>(keys.dashboards.list(), (old) =>
        old?.map((d) => (d.id === saved.id ? saved : d)),
      );
      qc.invalidateQueries({ queryKey: keys.dashboards.summary() });
    },
  });
}
