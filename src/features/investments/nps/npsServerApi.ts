import { serverApi } from '@/lib/api/server';
import type { NpsReviewResponse } from '@/lib/api/types';

import type { NpsStatement } from './npsImportModel';
import type { NpsContributor, NpsEntry, NpsEntryType, NpsSchemeDetail, NpsSummary, NpsTier } from './npsModel';

// The fetch helpers of the NPS page. The page imports these (never serverApi directly), so a test replaces one module.

export async function fetchNpsSummary(): Promise<NpsSummary> {
  const { data } = await serverApi.GET('/api/v1/nps/summary');
  return data as NpsSummary;
}

export interface NpsEntriesPage {
  content: NpsEntry[];
  totalElements: number;
  totalPages: number;
}

export async function fetchNpsEntries(params: { accountId?: string; tier?: NpsTier; type?: NpsEntryType; from?: string; to?: string; contributor?: NpsContributor; page: number; size: number }): Promise<NpsEntriesPage> {
  const { data } = await serverApi.GET('/api/v1/nps/entries', { params: { query: params } });
  const page = data as unknown as { content: NpsEntry[]; totalElements: number; totalPages: number };
  return { content: page.content, totalElements: page.totalElements, totalPages: page.totalPages };
}

export async function fetchNpsSchemeDetail(code: string): Promise<NpsSchemeDetail> {
  const { data } = await serverApi.GET('/api/v1/nps/schemes/{code}', { params: { path: { code } } });
  return data as unknown as NpsSchemeDetail;
}

/** The statements imported into an account (all accounts without an id). */
export async function fetchNpsStatements(accountId?: string): Promise<NpsStatement[]> {
  const { data } = await serverApi.GET('/api/v1/nps/import/statements', { params: { query: { accountId } } });
  return (data ?? []) as NpsStatement[];
}

/** What the app left to the user on the NPS page: pairings, unrecorded payments, and the setup offer. */
export async function fetchNpsReview(): Promise<NpsReviewResponse> {
  const { data } = await serverApi.GET('/api/v1/nps/review');
  return data as NpsReviewResponse;
}
