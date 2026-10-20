import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';
import { isValidRef } from '@/lib/diagnostics/ref';

export function useDiagnosticsLookup(
  ref: string,
  type: string,
  admin: boolean,
) {
  const enabled = admin && Boolean(ref) && isValidRef(ref);

  return useQuery<DiagnosticsLookupResponse>({
    queryKey: ['diagnostics', ref, type],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/diagnostics/lookup', {
        params: {
          query: {
            ref,
            type: type || 'auto',
          },
        },
      });
      if (error) {
        throw error;
      }
      return data as DiagnosticsLookupResponse;
    },
    enabled,
    retry: 0,
    staleTime: 60_000,
  });
}
