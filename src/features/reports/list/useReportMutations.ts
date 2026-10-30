'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds/Toast/Toast';
import { addReportToDashboard, removeWidgetFromDashboard } from '@/features/dashboards/dashboardActions';
import { duplicateReport } from '@/features/reports/duplicateReportModel';
import { deleteReport } from '@/features/reports/reportActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { storeSavedDashboard } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';

/**
 * The row actions of the Reports list. The list is server-rendered, so each success refreshes the page.
 * Duplicate confirms afterwards with a toast whose Undo deletes the copy; Delete is confirmed first by the page.
 */
export function useReportMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: keys.reports.all });
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });

  const remove = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteReport(id)),
    onSuccess: () => {
      showToast('Report deleted');
      done();
    },
    onError: failed("Couldn't delete the report. Try again."),
  });

  const undoDuplicate = useMutation({
    mutationFn: (copyId: string) => unwrapAction(deleteReport(copyId)),
    onSuccess: () => {
      showToast('Copy deleted');
      done();
    },
    onError: failed("Couldn't delete the copy. Try again."),
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

  // The server reads the dashboard fresh before every save, so a widget added or moved elsewhere since the list loaded is never overwritten.
  const removeWidget = useMutation({
    mutationFn: ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }) =>
      unwrapAction(removeWidgetFromDashboard(dashboardId, widgetId)),
    onSuccess: (saved) => {
      if (saved) storeSavedDashboard(queryClient, saved);
      showToast(saved ? `Removed from ${saved.name}` : 'Already removed');
      done();
    },
    onError: failed("Couldn't remove the report from the dashboard. Try again."),
  });

  const addToDashboard = useMutation({
    mutationFn: ({ dashboardId, report }: { dashboardId: string; report: Pick<ReportSummaryResponse, 'id' | 'name' | 'type'> }) =>
      unwrapAction(addReportToDashboard(dashboardId, report)),
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
