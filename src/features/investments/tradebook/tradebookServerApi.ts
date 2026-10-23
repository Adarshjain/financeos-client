import { investmentsApi, jobsApi } from '@/lib/apiClient';
import type { TradesQuery } from '@/lib/investments.types';
import type { JobResponse, JobType } from '@/lib/jobs.types';
import type { PagedInvestmentTransactionResponse } from '@/lib/types';

// The fetch helpers of the Tradebook page. The page imports these (never apiClient directly), so a test
// replaces one module.

export function fetchTradebookPage(query: TradesQuery): Promise<PagedInvestmentTransactionResponse> {
  return investmentsApi.getTrades(query);
}

/** The newest job of a type, or null when none ran. */
async function latestJob(type: JobType): Promise<JobResponse | null> {
  const page = await jobsApi.list({ type, page: 0, size: 1 });
  return page.content[0] ?? null;
}

export function fetchLastImportJob(): Promise<JobResponse | null> {
  return latestJob('INVESTMENT_IMPORT_COMMIT');
}

export function fetchLastReconcileJob(): Promise<JobResponse | null> {
  return latestJob('BROKER_RECONCILE_COMMIT');
}
