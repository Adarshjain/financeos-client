import { instrumentsApi } from '@/lib/apiClient';
import type { InstrumentListPage, InstrumentListQuery } from '@/lib/instrumentList';
import type { InstrumentType } from '@/lib/types';

import { instrumentsQuery, type InstrumentsUrlState } from './instrumentsModel';

// The fetch helpers of the Instruments tab. The page imports these (never apiClient directly), so a test replaces one module.

export function fetchInstrumentsPage(query: InstrumentListQuery): Promise<InstrumentListPage> {
  return instrumentsApi.list(query);
}

const COUNTED_TYPES: InstrumentType[] = ['stock', 'mutual_fund', 'etf'];

/** Instruments per type for the chips, over the search and the stale filter (not the type): one `size=1` request each, only the total is read. */
export async function fetchInstrumentTypeCounts(state: InstrumentsUrlState): Promise<Partial<Record<InstrumentType, number>>> {
  const counts = await Promise.all(
    COUNTED_TYPES.map(async (type) => {
      const page = await instrumentsApi.list({ ...instrumentsQuery({ ...state, type, page: 0, size: 1 }), page: 0, size: 1 });
      return [type, page.totalElements] as const;
    }),
  );
  return Object.fromEntries(counts);
}
