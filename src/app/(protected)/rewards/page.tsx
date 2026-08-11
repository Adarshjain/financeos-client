import RewardsBrowser from '@/components/rewards/RewardsBrowser';
import { accountsApi, rewardsApi } from '@/lib/apiClient';
import { accountAnniversaryDate, anniversaryYearRange, rewardEligibleAccounts } from '@/lib/rewards.types';
import { toCalendarDate } from '@/lib/utils';

export default async function RewardsPage() {
  const accounts = await accountsApi.list().catch(() => []);

  const orderedAccounts = rewardEligibleAccounts(accounts);
  const initialAccountId = orderedAccounts[0]?.id ?? '';

  // Default view = the card's current anniversary year (the browser's default
  // preset) — calendar year when the card has no anniversary set.
  const range = anniversaryYearRange(accountAnniversaryDate(orderedAccounts[0]), 0);
  const initialFrom = toCalendarDate(range.from);
  const initialTo = toCalendarDate(range.to);

  const [initialReport, initialLines] = initialAccountId
    ? await Promise.all([
        rewardsApi.report({ accountId: initialAccountId, from: initialFrom, to: initialTo }).catch(() => null),
        rewardsApi
          .lines({ accountId: initialAccountId, from: initialFrom, to: initialTo, page: 0, size: 25 })
          .catch(() => null),
      ])
    : [null, null];

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rewards</h1>
      <RewardsBrowser
        accounts={orderedAccounts}
        initialAccountId={initialAccountId}
        initialFrom={initialFrom}
        initialTo={initialTo}
        initialReport={initialReport}
        initialLines={initialLines}
      />
    </div>
  );
}
