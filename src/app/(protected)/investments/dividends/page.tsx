import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, dividendsApi, investmentsApi } from '@/lib/apiClient';
import { AccountType, DividendSummary, PagedDividendResponse, Position } from '@/lib/types';

import { DividendsSection } from '../DividendsSection';

export default async function DividendsPage() {
  const [dividendsData, summaryData, positionsData, accounts] = await Promise.all([
    dividendsApi.list({ size: 25 }).catch(
      () =>
        ({
          content: [],
          totalElements: 0,
          number: 0,
          size: 25,
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
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <DividendsSection
        initialData={initialData}
        initialSummary={initialSummary}
        brokerAccounts={brokerAccounts}
        accounts={accounts}
        positions={positions}
      />
    </div>
  );
}
