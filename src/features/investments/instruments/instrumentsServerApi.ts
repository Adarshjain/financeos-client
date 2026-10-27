import { instrumentsApi } from '@/lib/apiClient';
import type { InstrumentListPage, InstrumentListQuery } from '@/lib/instrumentList';

// The fetch helpers of the Instruments tab. The page imports these (never apiClient directly), so a test replaces one module.

export function fetchInstrumentsPage(query: InstrumentListQuery): Promise<InstrumentListPage> {
  return instrumentsApi.list(query);
}
