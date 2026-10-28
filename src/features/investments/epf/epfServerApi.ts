import { epfApi } from '@/lib/apiClient';

import type { EpfEmployer, EpfEntry, EpfSummary } from './epfModel';

// The fetch helpers of the EPF page. The page imports these (never apiClient directly), so a test replaces one module.

/** The figures for one employer (every employer when none is given) and one FY (every year when none is given). */
export function fetchEpfSummary(params: { employerId?: string; fy?: number } = {}): Promise<EpfSummary> {
  return epfApi.summary({ employerId: params.employerId, fy: params.fy, allYears: params.fy === undefined });
}

export function fetchEpfEmployers(): Promise<EpfEmployer[]> {
  return epfApi.employers();
}

/** The financial years (starting years, newest first) an employer has entries in; every employer when none is given. */
export function fetchEpfFys(employerId?: string): Promise<number[]> {
  return epfApi.fys(employerId);
}

export interface EpfEntriesPage {
  content: EpfEntry[];
  totalElements: number;
  totalPages: number;
}

export async function fetchEpfEntries(params: { employerId?: string; fy?: number; page: number; size: number }): Promise<EpfEntriesPage> {
  const { content, totalElements, totalPages } = await epfApi.entries(params);
  return { content, totalElements, totalPages };
}
