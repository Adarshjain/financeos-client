'use client';

// The writes of a dashboard page, confirmed the Dinero way (a toast): save the draft (create or update), save one
// widget's settings straight away, and set or clear the default. Each caches what the server returned, so the
// page and the list show the saved dashboard before any refetch.

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components/ds';
import { deleteDashboard, saveDashboard, saveDashboardWidgets, setDashboardDefault } from '@/features/dashboards/dashboardActions';
import type { saveBody } from '@/features/dashboards/editor/editorStateModel';
import type { WidgetSettingsChange } from '@/features/dashboards/frame/WidgetSettingsDialog';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { storeSavedDashboard, useRestoreHomeDashboard } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';

type SaveBody = ReturnType<typeof saveBody>;

/** Refetches the list, the one dashboard and the summary; never the widgets' data or the built-ins catalog. */
function invalidateDashboardLists(queryClient: QueryClient, id?: string) {
  void queryClient.invalidateQueries({ queryKey: keys.dashboards.list() });
  void queryClient.invalidateQueries({ queryKey: keys.dashboards.summary() });
  if (id) void queryClient.invalidateQueries({ queryKey: keys.dashboards.byId(id) });
}

export const SAVE_FAILED = "Couldn't save the dashboard. Fix the fields marked in red.";

/** Creates the dashboard (no `id`) or updates it; resolves with the saved one. */
export function useSaveDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveBody }): Promise<DashboardResponse> => unwrapAction(saveDashboard(id, body)),
    onSuccess: (saved, { id }) => {
      if (id) storeSavedDashboard(queryClient, saved);
      invalidateDashboardLists(queryClient, saved.id);
      showToast(id ? 'Dashboard saved' : 'Dashboard created');
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't save the dashboard. Try again."), { tone: 'danger' }),
  });
}

/** Saves one widget's params and title as they are shown: the dashboard with only that widget changed. */
export function useSaveWidgetSettings(dashboard: DashboardResponse | undefined, onSaved: (saved: DashboardResponse) => void) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ widgetId, change }: { widgetId: string; change: WidgetSettingsChange }) => {
      if (!dashboard) throw new Error('Dashboard not found');
      const widgets: WidgetResponse[] = dashboard.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...(change.params ? { params: change.params } : {}), title: change.title } : w,
      );
      return unwrapAction(saveDashboardWidgets(dashboard, widgets));
    },
    onSuccess: (saved) => {
      storeSavedDashboard(queryClient, saved);
      onSaved(saved);
    },
  });
  // Rejects on failure: the settings dialog reports it and stays open.
  return (widgetId: string, change: WidgetSettingsChange) => mutation.mutateAsync({ widgetId, change }).then(() => undefined);
}

/** Sets this dashboard as the default, or clears it when it already is. */
export function useToggleDefault(onSaved: (saved: DashboardResponse) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; makeDefault: boolean; updatedAt: string }) => unwrapAction(setDashboardDefault(vars)),
    onSuccess: (saved, vars) => {
      invalidateDashboardLists(queryClient, saved?.id ?? vars.id);
      if (saved) onSaved(saved);
      showToast(vars.makeDefault ? 'Default dashboard set' : 'Default cleared');
    },
    onError: (e) =>
      showToast(getErrorMessage(e, "Couldn't change the default dashboard. Try again."), { tone: 'danger' }),
  });
}

/** Deletes a dashboard (the page confirms first); its saved reports stay. */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrapAction(deleteDashboard(id)),
    onSuccess: (_res, id) => {
      invalidateDashboardLists(queryClient, id);
      showToast('Dashboard deleted');
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't delete the dashboard. Try again."), { tone: 'danger' }),
  });
}

/** Brings back the seeded Home dashboard as the default; a failure's toast offers Retry. */
export function useRestoreHome(onRestored?: () => void) {
  const restore = useRestoreHomeDashboard();
  const run = () =>
    restore.mutate(undefined, {
      onSuccess: () => {
        showToast('Home dashboard restored');
        onRestored?.();
      },
      onError: () => showToast("Couldn't restore Home. Try again.", { tone: 'danger', action: { label: 'Retry', onSelect: run } }),
    });
  return { restore: run, pending: restore.isPending };
}

function readLatestDashboard(queryClient: QueryClient, id: string): DashboardResponse | undefined {
  return (
    queryClient.getQueryData<DashboardResponse[]>(keys.dashboards.list())?.find((d) => d.id === id) ??
    queryClient.getQueryData<DashboardResponse>(keys.dashboards.byId(id))
  );
}

/** Adds a widget to a dashboard and saves it straight away; the toast's Undo removes that widget and saves again. */
export function useAddWidgetNow() {
  const queryClient = useQueryClient();
  const removeWidget = useMutation({
    mutationFn: ({ dashboardId, widgetIds }: { dashboardId: string; widgetIds: string[] }) => {
      const latest = readLatestDashboard(queryClient, dashboardId);
      if (!latest) throw new Error('Dashboard not found');
      return unwrapAction(saveDashboardWidgets(latest, latest.widgets.filter((w) => !widgetIds.includes(w.id))));
    },
    onSuccess: (saved) => storeSavedDashboard(queryClient, saved),
    onError: (e) => showToast(getErrorMessage(e, "Couldn't remove the widget. Try again."), { tone: 'danger' }),
  });
  return useMutation({
    mutationFn: async ({ dashboard, widget }: { dashboard: DashboardResponse; widget: WidgetResponse }) => {
      // The latest saved dashboard, not the snapshot the click saw (a quick second add or a settings save may have landed since).
      const latest = readLatestDashboard(queryClient, dashboard.id) ?? dashboard;
      const saved = await unwrapAction(saveDashboardWidgets(latest, [...latest.widgets, widget]));
      return { saved, before: latest.widgets.map((w) => w.id) };
    },
    onSuccess: ({ saved, before: beforeIds }) => {
      storeSavedDashboard(queryClient, saved);
      // The widgets that were not there before (by id, in case the server numbered the new one itself).
      const before = new Set(beforeIds);
      const widgetIds = saved.widgets.filter((w) => !before.has(w.id)).map((w) => w.id);
      showToast(`Widget added to ${saved.name}`, {
        action: { label: 'Undo', onSelect: () => removeWidget.mutate({ dashboardId: saved.id, widgetIds }) },
      });
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't add the widget. Try again."), { tone: 'danger' }),
  });
}
