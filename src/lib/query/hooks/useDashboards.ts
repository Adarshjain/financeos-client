'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { DashboardResponse, UpdateDashboardRequest } from '@/lib/api/types';
import { toDashboardWidget } from '@/lib/dashboards.helpers';
import type { WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

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

/** A dashboard as shown: what a save outside edit mode PUTs back, with its widgets changed. */
type ShownDashboard = Pick<DashboardResponse, 'id' | 'name' | 'description' | 'isDefault' | 'widgets'>;

/** PUT the dashboard as shown with `widgets` in place of its own. */
export async function putWidgets(dashboard: ShownDashboard, widgets: WidgetResponse[]): Promise<DashboardResponse> {
  const body: UpdateDashboardRequest = {
    name: dashboard.name,
    description: dashboard.description?.trim() || undefined,
    isDefault: dashboard.isDefault,
    widgets: widgets.map(toDashboardWidget),
  };
  const { data } = await api.PUT('/api/v1/dashboards/{id}', { params: { path: { id: dashboard.id } }, body });
  return data as DashboardResponse;
}

/** The detail and list caches take a saved dashboard; the summary (counts) refetches. */
export function storeSavedDashboard(qc: QueryClient, saved: DashboardResponse) {
  qc.setQueryData(keys.dashboards.byId(saved.id), saved);
  qc.setQueryData<DashboardResponse[]>(keys.dashboards.list(), (old) =>
    old?.map((d) => (d.id === saved.id ? saved : d)),
  );
  qc.invalidateQueries({ queryKey: keys.dashboards.summary() });
}

/** What a widget-settings save needs: the dashboard as shown, the widget, and its new params. */
export interface WidgetParamsChange {
  dashboard: ShownDashboard;
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
    mutationFn: ({ dashboard, widgetId, params }: WidgetParamsChange) =>
      putWidgets(dashboard, dashboard.widgets.map((w) => (w.id === widgetId ? { ...w, params } : w))),
    onSuccess: (saved) => storeSavedDashboard(qc, saved),
  });
}

/**
 * Add one widget outside edit mode (Home's "Add widget"): PUT the dashboard
 * as shown with the new widget appended (it is already placed below the
 * rest), then store the saved dashboard like a widget-settings save.
 */
export function useAddDashboardWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dashboard, widget }: { dashboard: ShownDashboard; widget: WidgetResponse }) =>
      putWidgets(dashboard, [...dashboard.widgets, widget]),
    onSuccess: (saved) => {
      storeSavedDashboard(qc, saved);
      toast.success(`Widget added to ${saved.name}`);
    },
    onError: (e) => toastError(e, 'Failed to add widget'),
  });
}

/**
 * Set or clear a dashboard's default flag. Re-reads the dashboard first and
 * refuses rather than clobber one that changed since the caller rendered it —
 * `updatedAt` is the version the caller showed. The server clears the flag
 * on the previous default.
 */
export async function setDefaultDashboard({
  id,
  makeDefault,
  updatedAt,
}: {
  id: string;
  makeDefault: boolean;
  updatedAt: string;
}) {
  const { data: current } = await api.GET('/api/v1/dashboards/{id}', {
    params: { path: { id } },
  });
  if (!current) throw new Error('Dashboard not found');
  if (current.updatedAt !== updatedAt) {
    throw new Error(
      'This dashboard changed since the page was loaded. Reload and try again — setting the default would otherwise discard those changes.',
    );
  }
  const widgets = current.widgets.map(toDashboardWidget);
  return api.PUT('/api/v1/dashboards/{id}', {
    params: { path: { id } },
    body: {
      name: current.name,
      description: current.description ?? undefined,
      isDefault: makeDefault,
      widgets,
    },
  });
}

export function useSetDefaultDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setDefaultDashboard,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: keys.dashboards.all });
      toast.success(vars.makeDefault ? 'Set as default' : 'Default cleared');
    },
    onError: (e) =>
      toastError(e, e instanceof Error ? e.message : 'Failed to update default dashboard'),
  });
}
