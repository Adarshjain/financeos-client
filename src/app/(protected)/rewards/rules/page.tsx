import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import RewardRulesManager from '@/components/rewards/RewardRulesManager';
import { accountsApi, categoriesApi, rewardsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import { rewardEligibleAccounts } from '@/lib/rewards.types';

export default async function RewardRulesPage() {
  const [accounts, categories] = await Promise.all([
    accountsApi.list().catch(() => []),
    categoriesApi.list().catch(() => []),
  ]);

  const orderedAccounts = rewardEligibleAccounts(accounts);
  const initialAccountId = orderedAccounts[0]?.id ?? '';

  const qc = getQueryClient();
  if (initialAccountId) {
    await Promise.all([
      qc.prefetchQuery({
        queryKey: keys.rewards.rules(initialAccountId),
        queryFn: () => rewardsApi.listRules(initialAccountId),
      }),
      qc.prefetchQuery({
        queryKey: keys.rewards.capBuckets(initialAccountId),
        queryFn: () => rewardsApi.listCapBuckets(initialAccountId),
      }),
      qc.prefetchQuery({
        queryKey: keys.rewards.config(initialAccountId),
        queryFn: () => rewardsApi.getAccountConfig(initialAccountId),
      }),
    ]);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reward Rules</h1>
      </div>
      <HydrationBoundary state={dehydrate(qc)}>
        <RewardRulesManager
          accounts={orderedAccounts}
          categories={categories}
          initialAccountId={initialAccountId}
        />
      </HydrationBoundary>
    </div>
  );
}
