import type { QueryClient } from '@tanstack/react-query';

import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

export const NPS_IMPORT_REFETCH_MS = [3000, 10000];

let pending: ReturnType<typeof setTimeout>[] = [];

/**
 * An NPS import runs as a job with no progress: re-read after ~3 s and again after ~10 s.
 * Only query keys are invalidated (the QueryClient is global, so this is safe after unmount); never the router or component state.
 * A new call cancels the earlier pair.
 */
export function scheduleNpsImportRefetch(qc: QueryClient): void {
  for (const t of pending) clearTimeout(t);
  pending = NPS_IMPORT_REFETCH_MS.map((delay) =>
    setTimeout(() => {
      void qc.invalidateQueries({ queryKey: keys.nps.all });
      void invalidateInvestmentQueries(qc);
    }, delay),
  );
}
