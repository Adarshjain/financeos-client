'use client';

// "Duplicate as my report" for a built-in template widget: the server resolves
// the template with this widget's params (POST /dashboards/builtins/{key}/definition)
// and the result is saved as a new report, named after the built-in, which the
// user can then edit freely. A template whose rows depend on a reward window
// (milestones, caps) is resolved against the window open today — the copy is
// fixed to it, and the toast says so.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { isoToDisplay } from '@/components/ui/date-input';
import { api } from '@/lib/api/client';
import type { WidgetParams } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

interface DuplicateBuiltinVars {
  builtinKey: string;
  params: WidgetParams;
}

/** The toast's note for a copy fixed to a reward window ("…open on 01/10/2026"); null otherwise. */
export function windowNote(windowAsOf: string | null | undefined): string | null {
  return windowAsOf ? `This copy is fixed to the window open on ${isoToDisplay(windowAsOf)}.` : null;
}

export function useDuplicateBuiltin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ builtinKey, params }: DuplicateBuiltinVars) => {
      const { data: resolved } = await api.POST('/api/v1/dashboards/builtins/{key}/definition', {
        params: { path: { key: builtinKey } },
        body: { params },
      });
      if (!resolved) throw new Error('This widget cannot be copied as a report.');
      const { data: report } = await api.POST('/api/v1/reports', {
        body: {
          name: resolved.label,
          type: resolved.type,
          datasource: resolved.datasource,
          definition: resolved.definition,
        } as never,
      });
      if (!report) throw new Error('Failed to create the report.');
      return { report, windowAsOf: resolved.windowAsOf ?? null };
    },
    onSuccess: ({ report, windowAsOf }) => {
      qc.invalidateQueries({ queryKey: keys.reports.all });
      const note = windowNote(windowAsOf);
      toast.success(`Saved "${report.name}" to your reports`, {
        ...(note ? { description: note } : {}),
        action: { label: 'Open', onClick: () => router.push(`/reports/${report.id}`) },
      });
    },
    onError: (e) => toastError(e, 'Failed to duplicate as a report'),
  });
}
