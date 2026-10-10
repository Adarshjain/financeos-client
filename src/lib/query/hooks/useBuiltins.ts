'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

/**
 * The entries only change with a server release; their per-user
 * `unavailableReason` can change sooner, so the Add-widget picker
 * invalidates the catalog each time it opens.
 */
export const BUILTINS_STALE_TIME = 10 * 60 * 1000;

/** GET /dashboards/builtins — shared by the hook and imperative `fetchQuery` callers. */
export async function fetchBuiltins(): Promise<BuiltinWidgetResponse[]> {
  const { data } = await api.GET('/api/v1/dashboards/builtins');
  return (data ?? []) as BuiltinWidgetResponse[];
}

/** The built-in dashboard widget catalog. */
export function useBuiltins(enabled = true) {
  return useQuery({
    queryKey: keys.dashboards.builtins(),
    queryFn: fetchBuiltins,
    staleTime: BUILTINS_STALE_TIME,
    enabled,
  });
}
