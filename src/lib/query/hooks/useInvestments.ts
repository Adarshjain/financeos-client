'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Instrument, Position } from '@/lib/types';

/**
 * Narrow raw positions payload array at boundary from unknown.
 */
function asPositions(raw: unknown): Position[] {
  return (raw ?? []) as Position[];
}

/**
 * Narrow raw instruments payload array at boundary from unknown.
 */
function asInstruments(raw: unknown): Instrument[] {
  return (raw ?? []) as Instrument[];
}

export function usePositions(initialData?: Position[]) {
  return useQuery<Position[]>({
    queryKey: keys.investments.positions(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/investments/positions');
      return asPositions(data?.positions);
    },
    initialData,
  });
}

export function useInstruments(query?: string, initialData?: Instrument[]) {
  return useQuery<Instrument[]>({
    queryKey: keys.investments.instruments(query),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/instruments', {
        params: { query: query ? { search: query } : {} },
      });
      return asInstruments(data);
    },
    initialData,
  });
}
