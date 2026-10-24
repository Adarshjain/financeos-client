'use client';

import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

import { Select } from '@/components/ds';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { rewardEligibleAccounts } from '@/lib/rewards.types';

import { CapsSection } from './caps/CapsSection';
import { CardSettings } from './CardSettings';
import { MilestonesSection } from './milestones/MilestonesSection';
import { RulesSection } from './rules/RulesSection';
import type { RulesUsage } from './rulesPageModel';
import { RulesRefreshProvider } from './rulesRefresh';

export interface RulesPageProps {
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
export function RulesPage({ accountId, usage, today }: RulesPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accounts = rewardEligibleAccounts(useAccounts().data ?? []);

  return (
    <RulesRefreshProvider value={() => router.refresh()}>
    <div className="flex flex-col gap-space-16">
      <Select
        className="desk:w-container-xs"
        label="Card"
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        value={accountId}
        onValueChange={(v) => {
          const id = Array.isArray(v) ? v[0] : v;
          if (id && id !== accountId) router.replace(`${pathname}?account=${id}`);
        }}
      />
      <RulesSection accountId={accountId} today={today} usage={usage?.earned} />
      <div className="grid grid-cols-1 items-start gap-space-16 desk:grid-cols-2">
        <CapsSection accountId={accountId} usage={usage?.caps} />
        <MilestonesSection accountId={accountId} usage={usage?.milestones} />
      </div>
      <CardSettings accountId={accountId} />
    </div>
    </RulesRefreshProvider>
  );
}
