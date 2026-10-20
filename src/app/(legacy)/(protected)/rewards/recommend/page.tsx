import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import RecommendSimulator from '@/components/rewards/RecommendSimulator';
import { accountsApi, categoriesApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function RewardRecommendPage() {
  const qc = getQueryClient();
  const [categories, accounts] = await Promise.all([
    categoriesApi.list().catch(() => []),
    accountsApi.list().catch(() => []),
  ]);

  qc.setQueryData(keys.categories.list(), categories);
  qc.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Card Picker
          </h1>
        </div>

        <RecommendSimulator />
      </div>
    </HydrationBoundary>
  );
}
