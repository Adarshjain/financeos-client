import React from 'react';

import { AccountTitle } from '@/features/accounts/detail/AccountTitle';
import type { RewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import { RewardsTab } from '@/features/accounts/detail/rewards/RewardsTab';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import type { Account } from '@/lib/account.types';

import { REWARDS_HREF, rewardsCardHref } from './rewardsTabs';

/** A card's rewards: the same page body as Accounts → card → Rewards, under the Rewards top bar. */
export function RewardsCardScreen({ account, today, data }: { account: Account; today: string; data: RewardsTabData }) {
  return (
    <ShellPage crumb={subCrumb('rewards')} title={<AccountTitle account={account} />} backHref={REWARDS_HREF}>
      <RewardsTab account={account} today={today} data={data} basePath={rewardsCardHref(account.id)} />
    </ShellPage>
  );
}
