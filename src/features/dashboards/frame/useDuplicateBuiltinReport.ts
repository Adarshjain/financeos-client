'use client';

// "Duplicate as my report" for a built-in template widget, as Dinero confirms it: a toast naming the copy, with
// Open to go to its editor (and the reward-window note when the copy is fixed to one).

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components/ds';
import { duplicateBuiltin, windowNote } from '@/features/dashboards/data/duplicateBuiltinModel';
import { reportHref } from '@/features/reports/list/reportsListModel';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

export function useDuplicateBuiltinReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicateBuiltin,
    onSuccess: ({ report, windowAsOf }) => {
      void queryClient.invalidateQueries({ queryKey: keys.reports.all });
      const note = windowNote(windowAsOf);
      showToast(`Report "${report.name}" saved${note ? `. ${note.replace(/\.$/, '')}` : ''}`, {
        action: { label: 'Open', href: reportHref(report.id) },
      });
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't copy the widget as a report. Try again."), { tone: 'danger' }),
  });
}
