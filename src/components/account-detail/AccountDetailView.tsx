'use client';

import { CreditCard, Gift } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { useAccount } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AccountActions } from './AccountActions';
import { AccountHeader } from './AccountHeader';
import { AccountOverview } from './AccountOverview';
import { AccountRecentTransactions } from './AccountRecentTransactions';
import { BillsSection } from './BillsSection';
import { SectionCard } from './SectionCard';

/** Per-account hub: header + stacked sections. `account` seeds the live query so edits refresh in place. */
export function AccountDetailView({ account: initial }: { account: Account }) {
  const { data } = useAccount(initial.id, initial);
  const account = data ?? initial;
  const isCard = account.type === AccountType.CREDIT_CARD;
  const closed = isAccountClosed(account);
  const rewardEligible = account.type !== AccountType.BROKER && !closed;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:pb-8">
      <Link href="/accounts" className="inline-flex text-xs font-medium text-slate-500 hover:text-emerald-600">
        &larr; Accounts
      </Link>
      <AccountHeader account={account} actions={<AccountActions account={account} />} />
      <AccountOverview account={account} />
      {isCard && !closed ? (
        <SectionCard
          icon={<CreditCard />}
          title="Bills"
          subtitle="Current bill and spend since the last statement"
          // The bills widget pads its own rows; the section adds only the bottom inset.
          bodyClassName="px-0 sm:px-0 pb-2 sm:pb-2"
        >
          <BillsSection accountId={account.id} />
        </SectionCard>
      ) : null}
      {rewardEligible ? (
        <SectionCard
          icon={<Gift />}
          title="Earning rules"
          subtitle="Reward rules, caps and milestones for this account."
          action={
            <Link
              href={`/rewards/rules?account=${account.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Manage rules
            </Link>
          }
        />
      ) : null}
      <AccountRecentTransactions account={account} />
    </div>
  );
}
