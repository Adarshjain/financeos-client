import RecommendSimulator from '@/components/rewards/RecommendSimulator';
import { accountsApi, categoriesApi } from '@/lib/apiClient';
import { rewardEligibleAccounts } from '@/lib/rewards.types';

export default async function RewardRecommendPage() {
  const [categories, accounts] = await Promise.all([
    categoriesApi.list().catch(() => []),
    accountsApi.list().catch(() => []),
  ]);

  const eligibleAccounts = rewardEligibleAccounts(accounts);

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Card Picker
        </h1>
      </div>

      <RecommendSimulator categories={categories} accounts={eligibleAccounts} />
    </div>
  );
}

