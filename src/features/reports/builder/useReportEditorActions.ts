'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { duplicateReport } from '@/features/reports/duplicateReport';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import type { CreateReportRequest, ReportResponse, UpdateReportRequest } from '@/lib/reports.types';

/**
 * The editor's writes: create, update, duplicate (confirmed afterwards with a toast whose Undo deletes the copy)
 * and delete (confirmed first by the page). Failures surface as a toast with the server's message.
 *
 * Next keeps visited pages in its router cache for 30 seconds (`staleTimes.dynamic`), so the list and a report's
 * own page would show the old data after a write. Every write that leaves the editor in place therefore calls
 * `router.refresh()`, which drops that cache; the draft is client state and survives it. Delete leaves the page,
 * so the editor navigates first and refreshes after (refreshing a deleted report's page would be a 404).
 */
export function useReportEditorActions() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: keys.reports.all });
  const changed = () => {
    invalidate();
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });

  const create = useMutation({
    mutationFn: (body: CreateReportRequest) =>
      api
        .POST('/api/v1/reports', { body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } } })
        .then((r) => r.data as unknown as ReportResponse),
    onSuccess: changed,
    onError: failed("Couldn't save the report. Try again."),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateReportRequest }) =>
      api
        .PUT('/api/v1/reports/{id}', {
          params: { path: { id } },
          body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
        })
        .then((r) => r.data as unknown as ReportResponse),
    onSuccess: changed,
    onError: failed("Couldn't save the report. Try again."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/reports/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      showToast('Report deleted');
      invalidate();
    },
    onError: failed("Couldn't delete the report. Try again."),
  });

  const undoDuplicate = useMutation({
    mutationFn: (copyId: string) => api.DELETE('/api/v1/reports/{id}', { params: { path: { id: copyId } } }),
    onSuccess: () => {
      showToast('Copy deleted');
      changed();
    },
    onError: failed("Couldn't delete the copy. Try again."),
  });

  const duplicate = useMutation({
    mutationFn: duplicateReport,
    onSuccess: (copy) => {
      showToast('Report duplicated', {
        action: copy ? { label: 'Undo', onSelect: () => undoDuplicate.mutate(copy.id) } : undefined,
      });
      changed();
    },
    onError: failed("Couldn't duplicate the report. Try again."),
  });

  return { create, update, remove, duplicate };
}
