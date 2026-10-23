'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import type { CreateInstrumentRequest, Instrument } from '@/lib/types';

/** Creates an instrument by hand (POST /instruments) and refreshes every investments query. */
export function useCreateInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInstrumentRequest) =>
      api.POST('/api/v1/instruments', { body }).then((r) => r.data! as Instrument),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}
