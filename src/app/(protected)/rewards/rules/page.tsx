import RewardRulesManager from '@/components/rewards/RewardRulesManager';
import { accountsApi, categoriesApi, rewardsApi } from '@/lib/apiClient';
import { rewardEligibleAccounts } from '@/lib/rewards.types';

export default async function RewardRulesPage() {
  const [accounts, categories] = await Promise.all([
    accountsApi.list().catch(() => []),
    categoriesApi.list().catch(() => []),
  ]);

  const orderedAccounts = rewardEligibleAccounts(accounts);
  const initialAccountId = orderedAccounts[0]?.id ?? '';
  const [initialRules, initialCapBuckets, initialConfig] = initialAccountId
    ? await Promise.all([
        rewardsApi.listRules(initialAccountId).catch(() => []),
        rewardsApi.listCapBuckets(initialAccountId).catch(() => []),
        rewardsApi.getAccountConfig(initialAccountId).catch(() => null),
      ])
    : [[], [], null];

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reward Rules</h1>
      </div>
      <RewardRulesManager
        accounts={orderedAccounts}
        categories={categories}
        initialAccountId={initialAccountId}
        initialRules={initialRules}
        initialCapBuckets={initialCapBuckets}
        initialAnniversaryDate={initialConfig?.rewardAnniversaryDate ?? null}
        initialDefaultRewardType={initialConfig?.defaultRewardType ?? 'CASH'}
      />
    </div>
  );
}
