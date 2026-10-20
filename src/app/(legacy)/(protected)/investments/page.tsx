import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { JobsPanel } from '@/components/jobs/JobsPanel';
import { Account } from '@/lib/account.types';
import { accountsApi, investmentsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import { Position } from '@/lib/types';

import { HoldingsView } from './HoldingsView';

export default async function InvestmentsPage() {
  const qc = getQueryClient();

  const [positionsData, accounts] = await Promise.all([
    investmentsApi.getPositions().catch(() => ({ positions: [] })),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const positions: Position[] = positionsData.positions || [];
  qc.setQueryData(keys.investments.positions(), positions);
  qc.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        <HoldingsView>
          <JobsPanel
            types={[
              'PRICE_REFRESH',
              'INVESTMENT_IMPORT_COMMIT',
              'BROKER_RECONCILE_COMMIT',
            ]}
            title="Recent background jobs"
          />
        </HoldingsView>
      </div>
    </HydrationBoundary>
  );
}
