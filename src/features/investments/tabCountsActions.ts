'use server';

import { createDomainAction } from '@/lib/domainApi';

import {
  fetchCorporateActionsCount,
  fetchDividendsCount,
  fetchFnoCount,
  fetchTradebookCount,
} from './investmentsServerApi';

export interface InvestmentsCounts {
  tradebook: number;
  dividends: number;
  fno: number;
  'corporate-actions': number;
}

/** The counted tabs' totals, each from a one-row page. */
export const loadTabCounts = createDomainAction(
  { fallbackError: 'Failed to load the tab counts' },
  async (): Promise<InvestmentsCounts> => {
    const [tradebook, dividends, fno, corporateActions] = await Promise.all([
      fetchTradebookCount(),
      fetchDividendsCount(),
      fetchFnoCount(),
      fetchCorporateActionsCount(),
    ]);
    return { tradebook, dividends, fno, 'corporate-actions': corporateActions };
  },
);
