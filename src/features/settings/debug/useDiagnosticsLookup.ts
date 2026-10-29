import { useQuery } from '@tanstack/react-query';

import { lookupDiagnostics } from '@/features/settings/debug/diagnosticsActions';
import { unwrapAction } from '@/lib/actionResult';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';
import { isValidRef } from '@/lib/diagnostics/ref';
import { keys } from '@/lib/query/keys';

export function useDiagnosticsLookup(
  ref: string,
  type: string,
  admin: boolean,
) {
  const enabled = admin && Boolean(ref) && isValidRef(ref);

  return useQuery<DiagnosticsLookupResponse>({
    queryKey: keys.diagnostics.lookup(ref, type),
    queryFn: () => unwrapAction(lookupDiagnostics(ref, type)),
    enabled,
    retry: 0,
    staleTime: 60_000,
  });
}
