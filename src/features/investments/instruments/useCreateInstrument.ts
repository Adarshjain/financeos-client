'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import type { CreateInstrumentRequest } from '@/lib/types';

import { createInstrument } from './instrumentActions';

/** Creates an instrument by hand (POST /instruments) and refreshes every investments query. */
export function useCreateInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInstrumentRequest) => unwrapAction(createInstrument(body)),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}
