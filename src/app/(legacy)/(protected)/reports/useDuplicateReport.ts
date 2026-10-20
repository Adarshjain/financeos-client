'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/** Copies a report: fetches it, then creates "<name> (copy)" with the same definition. */
export function useDuplicateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src } = await api.GET('/api/v1/reports/{id}', {
        params: { path: { id } },
      });
      if (!src) throw new Error('Report not found');
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: `${src.name} (copy)`,
          description: src.description,
          type: src.type,
          datasource: src.datasource,
          definition: src.definition,
        } as never,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.reports.all });
      toast.success('Report duplicated');
    },
    onError: (e) => toastError(e, 'Failed to duplicate report'),
  });
}
