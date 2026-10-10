'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { type InstrumentListParams, instrumentListQuery } from '@/lib/instrumentList';
import { keys } from '@/lib/query/keys';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import type { Instrument, InvestmentSummary, Position } from '@/lib/types';

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

/**
 * One server page of the instrument catalog (GET /instruments is paged by name; an empty search
 * returns only the first page, never the whole table). Keeps the previous page on screen while the
 * next one loads.
 */
export function useInstruments(params: InstrumentListParams = {}, initialData?: Instrument[]) {
  const query = instrumentListQuery(params);
  return useQuery<Instrument[]>({
    queryKey: keys.investments.instruments({ ...query }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/instruments', { params: { query } });
      return asInstruments(data);
    },
    initialData,
    placeholderData: keepPreviousData,
  });
}

// --- Dashboard widgets (investments & loans group) ---
// Both live under keys.investments.all, which every trade / price / instrument
// mutation invalidates through invalidateInvestmentQueries (also the template
// widgets' data, e.g. allocation).

/** GET /investments/summary — portfolio totals, XIRR and the day change (portfolio_snapshot widget). */
export function usePortfolioSummary() {
  return useQuery<InvestmentSummary>({
    queryKey: keys.investments.summary(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/investments/summary');
      return data as InvestmentSummary;
    },
  });
}

/** GET /investments/tax/harvest — a financial year's booked gains and one page of open lots (tax_harvest widget). */
export function useTaxHarvest(params: { fy?: number; page: number; size: number }) {
  return useQuery<TaxHarvestResponse>({
    queryKey: keys.investments.taxHarvest(params),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/investments/tax/harvest', { params: { query: params } });
      return data as unknown as TaxHarvestResponse;
    },
  });
}
