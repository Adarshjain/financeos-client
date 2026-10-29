'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { InstrumentListPage, InstrumentListQuery } from '@/lib/instrumentList';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import type { InvestmentSummary, Position } from '@/lib/types';

export const loadPositions = createDomainAction(
  { fallbackError: "Couldn't load positions. Try again." },
  async (): Promise<Position[]> => {
    const { data } = await serverApi.GET('/api/v1/investments/positions');
    return (data?.positions ?? []) as unknown as Position[];
  },
);

/** One server page of the instrument catalog (a missing body reads as an empty page). */
export const loadInstruments = createDomainAction(
  { fallbackError: "Couldn't load instruments. Try again." },
  async (query: InstrumentListQuery): Promise<InstrumentListPage> => {
    const { data } = await serverApi.GET('/api/v1/instruments', { params: { query } });
    return (data ?? { items: [], page: 0, size: query.size, totalElements: 0, totalPages: 0 }) as unknown as InstrumentListPage;
  },
);

export const loadPortfolioSummary = createDomainAction(
  { fallbackError: "Couldn't load the portfolio. Try again." },
  async (): Promise<InvestmentSummary> => {
    const { data } = await serverApi.GET('/api/v1/investments/summary');
    return data as unknown as InvestmentSummary;
  },
);

export const loadTaxHarvest = createDomainAction(
  { fallbackError: "Couldn't load tax harvesting. Try again." },
  async (params: { fy?: number; page: number; size: number }): Promise<TaxHarvestResponse> => {
    const { data } = await serverApi.GET('/api/v1/investments/tax/harvest', { params: { query: params } });
    return data as unknown as TaxHarvestResponse;
  },
);
