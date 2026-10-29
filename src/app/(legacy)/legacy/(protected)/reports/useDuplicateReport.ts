'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { duplicateReport } from '@/features/reports/duplicateReportModel';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/** Copies a report: fetches it, then creates "<name> (copy)" with the same definition. */
export function useDuplicateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: duplicateReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.reports.all });
      toast.success('Report duplicated');
    },
    onError: (e) => toastError(e, 'Failed to duplicate report'),
  });
}
