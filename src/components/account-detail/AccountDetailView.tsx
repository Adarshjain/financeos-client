'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { useAccount } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { AccountActions } from './AccountActions';
import { AccountHeader } from './AccountHeader';
import { AccountOverview } from './AccountOverview';
import { AccountRecentTransactions } from './AccountRecentTransactions';
import { BillsSection } from './BillsSection';

/** Per-account hub: header + stacked sections. `account` seeds the live query so edits refresh in place. */
export function AccountDetailView({ account: initial }: { account: Account }) {
  const { data } = useAccount(initial.id, initial);
  const account = data ?? initial;
  const isCard = account.type === AccountType.CREDIT_CARD;
  const closed = isAccountClosed(account);
  const rewardEligible = account.type !== AccountType.BROKER && !closed;

  return (
    <div className="p-4 pb-24 space-y-3 max-w-3xl mx-auto">
      <Link href="/accounts" className="text-xs font-medium text-slate-500 hover:text-emerald-600">
        &larr; Accounts
      </Link>
      <AccountHeader account={account} actions={<AccountActions account={account} />} />
      <AccountOverview account={account} />
      {isCard && !closed ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bills</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <BillsSection accountId={account.id} />
          </CardContent>
        </Card>
      ) : null}
      {rewardEligible ? (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Earning rules</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Reward rules, caps and milestones for this account.
              </div>
            </div>
            <Link
              href={`/rewards/rules?account=${account.id}`}
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0"
            >
              Manage rules
            </Link>
          </CardContent>
        </Card>
      ) : null}
      <AccountRecentTransactions account={account} />
    </div>
  );
}
