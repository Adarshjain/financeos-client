import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { Account } from '@/lib/account.types';
import { accountsApi, dividendsApi, investmentsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import {
  DividendSummary,
  PagedDividendResponse,
  Position,
} from '@/lib/types';

import { DividendsSection } from '../DividendsSection';

const DIVIDENDS_INITIAL_PAGE_SIZE = 25;
// Must match the default (unfiltered, first-page) query params `DividendsSection`
// builds, so its useQuery calls hit these prefetched cache entries on first paint.
const INITIAL_LIST_PARAMS = { page: 0, size: DIVIDENDS_INITIAL_PAGE_SIZE };
const INITIAL_SUMMARY_PARAMS = {};

export default async function DividendsPage() {
  const qc = getQueryClient();
  const [dividendsData, summaryData, positionsData, accounts] =
    await Promise.all([
      dividendsApi.list({ size: DIVIDENDS_INITIAL_PAGE_SIZE }).catch(
        () =>
          ({
            content: [],
            totalElements: 0,
            number: 0,
            size: DIVIDENDS_INITIAL_PAGE_SIZE,
            totalPages: 0,
            first: true,
            last: true,
            empty: true,
          }) as PagedDividendResponse
      ),
      dividendsApi.summary().catch(
        () =>
          ({
            buckets: [],
            totalAmount: '0',
            totalTds: '0',
            totalNet: '0',
            totalCount: 0,
          }) as DividendSummary
      ),
      investmentsApi.getPositions().catch(() => ({ positions: [] })),
      accountsApi.list().catch(() => [] as Account[]),
    ]);

  const initialData: PagedDividendResponse = dividendsData;
  const initialSummary: DividendSummary = summaryData;
  const positions: Position[] = positionsData.positions || [];

  qc.setQueryData(keys.investments.dividends(INITIAL_LIST_PARAMS), initialData);
  qc.setQueryData(keys.investments.dividendSummary(INITIAL_SUMMARY_PARAMS), initialSummary);
  qc.setQueryData(keys.investments.positions(), positions);
  qc.setQueryData(keys.accounts.list(), accounts);

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <HydrationBoundary state={dehydrate(qc)}>
        <DividendsSection
          initialData={initialData}
          initialSummary={initialSummary}
        />
      </HydrationBoundary>
    </div>
  );
}
