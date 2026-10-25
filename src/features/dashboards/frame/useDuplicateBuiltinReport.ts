'use client';

// "Duplicate as my report" for a built-in template widget, as Dinero confirms it: a toast naming the copy, with
// Open to go to its editor (and the reward-window note when the copy is fixed to one).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { reportHref } from '@/features/reports/list/reportsList';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

import { duplicateBuiltin, windowNote } from '../data/duplicateBuiltin';

export function useDuplicateBuiltinReport() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: duplicateBuiltin,
    onSuccess: ({ report, windowAsOf }) => {
      void queryClient.invalidateQueries({ queryKey: keys.reports.all });
      const note = windowNote(windowAsOf);
      showToast(`Saved "${report.name}" to your reports.${note ? ` ${note}` : ''}`, {
        action: { label: 'Open', onSelect: () => router.push(reportHref(report.id)) },
      });
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't copy the widget as a report. Try again."), { tone: 'danger' }),
  });
}
