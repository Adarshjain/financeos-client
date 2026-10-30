'use client';

import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { rewardEligibleAccounts } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import { CapsSection } from './caps/CapsSection';
import { CardSettings } from './CardSettings';
import { MilestonesSection } from './milestones/MilestonesSection';
import { RulesSection } from './rules/RulesSection';
import type { RulesUsage } from './rulesPageModel';
import { RulesRefreshProvider } from './rulesRefresh';

const RULE_ACCOUNT_TYPES: readonly AccountType[] = [AccountType.CREDIT_CARD, AccountType.BANK_ACCOUNT, AccountType.GENERIC];

export interface RewardsRulesScreenProps {
  /** The card chosen by the address (or the default one). */
  accountId: string;
  /** The card's reward-year figures for the usage bars; null when they could not load. */
  usage: RulesUsage | null;
  today: string;
}

/**
 * The Earning rules tab (boards D-rewards-rules, P-rewards-rules): the card's rules, then its caps and milestones side by
 * side, then its settings. The card is chosen in the address, so a switch reloads the page's data on the server once.
 */
export function RewardsRulesScreen({ accountId, usage, today }: RewardsRulesScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accounts = rewardEligibleAccounts(useAccounts().data ?? []);

  return (
    <RulesRefreshProvider value={() => router.refresh()}>
    <div className="flex flex-col gap-space-8 desk:gap-space-12">
      <AccountPicker
        className="desk:w-container-xs"
        aria-label="Account"
        accounts={accounts}
        types={RULE_ACCOUNT_TYPES}
        value={accountId}
        onValueChange={(id) => {
          if (id && id !== accountId) router.replace(`${pathname}?account=${id}`);
        }}
      />
      <RulesSection accountId={accountId} today={today} usage={usage?.earned} />
      <div className="grid grid-cols-1 items-start gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-2">
        <CapsSection accountId={accountId} usage={usage?.caps} />
        <MilestonesSection accountId={accountId} usage={usage?.milestones} />
      </div>
      <CardSettings accountId={accountId} />
    </div>
    </RulesRefreshProvider>
  );
}
