'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { type InstrumentListPage, type InstrumentListParams, instrumentListQuery } from '@/lib/instrumentList';
import {
  loadInstruments,
  loadPortfolioSummary,
  loadPositions,
  loadTaxHarvest,
} from '@/lib/query/actions/investmentActions';
import { keys } from '@/lib/query/keys';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import type { InvestmentSummary, Position } from '@/lib/types';

export function usePositions(initialData?: Position[]) {
  return useQuery<Position[]>({
    queryKey: keys.investments.positions(),
    queryFn: () => unwrapAction(loadPositions()),
    initialData,
  });
}

/**
 * One server page of the instrument catalog with its total (GET /instruments is paged and sorted by
 * name on the server; an empty search returns only the first page, never the whole table). Keeps the
 * previous page on screen while the next one loads.
 */
export function useInstruments(params: InstrumentListParams = {}, initialData?: InstrumentListPage) {
  const query = instrumentListQuery(params);
  return useQuery<InstrumentListPage>({
    queryKey: keys.investments.instruments({ ...query }),
    queryFn: () => unwrapAction(loadInstruments(query)),
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
    queryFn: () => unwrapAction(loadPortfolioSummary()),
  });
}

/** GET /investments/tax/harvest — a financial year's booked gains and one page of open lots (tax_harvest widget). */
export function useTaxHarvest(params: { fy?: number; page: number; size: number }) {
  return useQuery<TaxHarvestResponse>({
    queryKey: keys.investments.taxHarvest(params),
    queryFn: () => unwrapAction(loadTaxHarvest(params)),
  });
}
