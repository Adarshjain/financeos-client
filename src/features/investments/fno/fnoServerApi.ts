import { fnoApi } from '@/lib/apiClient';
import type { CsvDownload, FnoPageQuery, FnoSummary, PageFnoTrades } from '@/lib/investments.types';

// The fetch helpers of the F&O page. The page imports these (never apiClient directly), so a test replaces one module.

/** One server page of F&O trades. */
export function fetchFnoPage(query: FnoPageQuery): Promise<PageFnoTrades> {
  return fnoApi.page(query);
}

/** The financial year's results: realised P&L, win rate, charges, by month and by underlying. */
export function fetchFnoSummary(query: { fy: number; brokerAccountId?: string }): Promise<FnoSummary> {
  return fnoApi.summary(query);
}

/** The financial year's trades as the ITR export CSV. */
export function fetchFnoCsv(fy: number): Promise<CsvDownload> {
  return fnoApi.exportCsv(fy);
}
