'use client';

// "Duplicate as my report" for a built-in template widget: copies the
// catalog's template (datasource, type, definition — with the widget's params
// applied) into a new saved report the user can then edit freely.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { builtinDefinitionWithParams } from '@/lib/dashboards.helpers';
import type { WidgetParams } from '@/lib/dashboards.types';
import { BUILTINS_STALE_TIME, fetchBuiltins } from '@/lib/query/hooks/useBuiltins';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

interface DuplicateBuiltinVars {
  builtinKey: string;
  params: WidgetParams;
}

export function useDuplicateBuiltin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ builtinKey, params }: DuplicateBuiltinVars) => {
      const catalog = await qc.fetchQuery({
        queryKey: keys.dashboards.builtins(),
        queryFn: fetchBuiltins,
        staleTime: BUILTINS_STALE_TIME,
      });
      const def = catalog.find((b) => b.key === builtinKey);
      if (!def || def.kind !== 'template' || !def.templateType || !def.datasource) {
        throw new Error('This widget cannot be copied as a report.');
      }
      const { data } = await api.POST('/api/v1/reports', {
        body: {
          name: def.label,
          description: def.description,
          type: def.templateType,
          datasource: def.datasource,
          definition: builtinDefinitionWithParams(def, params),
        } as never,
      });
      if (!data) throw new Error('Failed to create the report.');
      return data;
    },
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: keys.reports.all });
      toast.success(`Saved "${report.name}" to your reports`, {
        action: { label: 'Open', onClick: () => router.push(`/reports/${report.id}`) },
      });
    },
    onError: (e) => toastError(e, 'Failed to duplicate as a report'),
  });
}
