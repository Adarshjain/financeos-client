import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import RewardsBrowser from '@/components/rewards/RewardsBrowser';
import { accountsApi, rewardsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import { accountAnniversaryDate, anniversaryYearRange, rewardEligibleAccounts } from '@/lib/rewards.types';
import { toCalendarDate } from '@/lib/utils';

const INITIAL_LINES_PAGE = { page: 0, size: 25 };

export default async function RewardsPage() {
  const accounts = await accountsApi.list().catch(() => []);

  const orderedAccounts = rewardEligibleAccounts(accounts);
  const initialAccountId = orderedAccounts[0]?.id ?? '';

  // Default view = the card's current anniversary year (the browser's default
  // preset) — calendar year when the card has no anniversary set.
  const range = anniversaryYearRange(accountAnniversaryDate(orderedAccounts[0]), 0);
  const initialFrom = toCalendarDate(range.from);
  const initialTo = toCalendarDate(range.to);

  const qc = getQueryClient();
  if (initialAccountId) {
    const linesParams = { accountId: initialAccountId, from: initialFrom, to: initialTo, ...INITIAL_LINES_PAGE };
    await Promise.all([
      qc.prefetchQuery({
        queryKey: keys.rewards.report(initialAccountId, initialFrom, initialTo),
        queryFn: () => rewardsApi.report({ accountId: initialAccountId, from: initialFrom, to: initialTo }),
      }),
      qc.prefetchQuery({
        queryKey: keys.rewards.lines(linesParams),
        queryFn: () => rewardsApi.lines(linesParams),
      }),
    ]);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rewards</h1>
      <HydrationBoundary state={dehydrate(qc)}>
        <RewardsBrowser
          accounts={orderedAccounts}
          initialAccountId={initialAccountId}
          initialFrom={initialFrom}
          initialTo={initialTo}
        />
      </HydrationBoundary>
    </div>
  );
}
