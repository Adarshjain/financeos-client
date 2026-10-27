'use client';

// "Duplicate as my report" for a built-in template widget (the request lives in
// `@/features/dashboards/data/duplicateBuiltin`): on success a toast offers to open the new report; a template
// whose rows depend on a reward window says the copy is fixed to it.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { duplicateBuiltin, windowNote } from '@/features/dashboards/data/duplicateBuiltin';
import { legacyHref } from '@/features/shell/routes';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

export function useDuplicateBuiltin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: duplicateBuiltin,
    onSuccess: ({ report, windowAsOf }) => {
      qc.invalidateQueries({ queryKey: keys.reports.all });
      const note = windowNote(windowAsOf);
      toast.success(`Saved "${report.name}" to your reports`, {
        ...(note ? { description: note } : {}),
        action: { label: 'Open', onClick: () => router.push(legacyHref(`/reports/${report.id}`)) },
      });
    },
    onError: (e) => toastError(e, 'Failed to duplicate as a report'),
  });
}
