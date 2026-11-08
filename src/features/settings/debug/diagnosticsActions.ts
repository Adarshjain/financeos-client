'use server';

import { serverApi } from '@/lib/api/server';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

export const lookupDiagnostics = action('diagnostics.lookupDiagnostics', createDomainAction(
  { fallbackError: "Couldn't look that up. Try again." },
  async (ref: string, type: string): Promise<DiagnosticsLookupResponse> => {
    const { data } = await serverApi.GET('/api/v1/diagnostics/lookup', { params: { query: { ref, type: type || 'auto' } } });
    return data as DiagnosticsLookupResponse;
  },
));

/** The raw log entries of a lookup, as the server sends them. */
export const loadRawLog = action('diagnostics.loadRawLog', createDomainAction(
  { fallbackError: "Couldn't copy the raw log. Try again." },
  async (ref: string, type: string) => {
    const { data } = await serverApi.GET('/api/v1/diagnostics/lookup/raw', { params: { query: { ref, type: type || 'auto' } } });
    return data ?? [];
  },
));
