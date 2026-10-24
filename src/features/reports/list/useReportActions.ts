'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { DashboardResponse } from '@/lib/api/types';
import { reportWidgetResponse } from '@/lib/dashboards.helpers';
import { putWidgets, storeSavedDashboard } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { duplicateReport } from '../duplicateReport';

/**
 * The row actions of the Reports list. The list is server-rendered, so each success refreshes the page.
 * Duplicate confirms afterwards with a toast whose Undo deletes the copy; Delete is confirmed first by the page.
 */
export function useReportActions() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: keys.reports.all });
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });

  const remove = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/reports/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      showToast('Report deleted');
      done();
    },
    onError: failed("Couldn't delete the report. Try again."),
  });

  const undoDuplicate = useMutation({
    mutationFn: (copyId: string) => api.DELETE('/api/v1/reports/{id}', { params: { path: { id: copyId } } }),
    onSuccess: () => {
      showToast('Copy removed');
      done();
    },
    onError: failed("Couldn't remove the copy. Try again."),
  });

  const duplicate = useMutation({
    mutationFn: duplicateReport,
    onSuccess: (copy) => {
      showToast('Report duplicated', {
        action: copy ? { label: 'Undo', onSelect: () => undoDuplicate.mutate(copy.id) } : undefined,
      });
      done();
    },
    onError: failed("Couldn't duplicate the report. Try again."),
  });

  // The dashboard is read fresh before every save, so a widget added or moved elsewhere since the list loaded is never overwritten.
  const freshDashboard = async (id: string): Promise<DashboardResponse> => {
    const { data } = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id } } });
    if (!data) throw new Error('Dashboard not found');
    return data;
  };

  const removeWidget = useMutation({
    mutationFn: async ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }) => {
      const current = await freshDashboard(dashboardId);
      if (!current.widgets.some((w) => w.id === widgetId)) return null;
      return putWidgets(current, current.widgets.filter((w) => w.id !== widgetId));
    },
    onSuccess: (saved) => {
      if (saved) storeSavedDashboard(queryClient, saved);
      showToast(saved ? `Removed from ${saved.name}` : 'Already removed');
      done();
    },
    onError: failed("Couldn't remove the report from the dashboard. Try again."),
  });

  const addToDashboard = useMutation({
    mutationFn: async ({ dashboardId, report }: { dashboardId: string; report: Pick<ReportSummaryResponse, 'id' | 'name' | 'type'> }) => {
      const current = await freshDashboard(dashboardId);
      const widget = reportWidgetResponse(current.widgets, report);
      const saved = await putWidgets(current, [...current.widgets, widget]);
      return { saved, widgetId: widget.id };
    },
    onSuccess: ({ saved, widgetId }) => {
      storeSavedDashboard(queryClient, saved);
      showToast(`Added to ${saved.name}`, {
        action: { label: 'Undo', onSelect: () => removeWidget.mutate({ dashboardId: saved.id, widgetId }) },
      });
      done();
    },
    onError: failed("Couldn't add the report to the dashboard. Try again."),
  });

  return { remove, duplicate, addToDashboard };
}
