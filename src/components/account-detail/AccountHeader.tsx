import { Briefcase, CreditCard, Landmark, Wallet } from 'lucide-react';
import { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { formatMoney, formatNullableMoney } from '@/lib/utils';

/** How each account type reads for people (also the account_tile widget's subtitle). */
export const TYPE_LABEL: Record<string, string> = {
  [AccountType.BANK_ACCOUNT]: 'Bank account',
  [AccountType.CREDIT_CARD]: 'Credit card',
  [AccountType.BROKER]: 'Broker',
  [AccountType.GENERIC]: 'Wallet / Cash',
};

export const TYPE_ICON: Record<string, ReactNode> = {
  [AccountType.BANK_ACCOUNT]: <Landmark />,
  [AccountType.CREDIT_CARD]: <CreditCard />,
  [AccountType.BROKER]: <Briefcase />,
  [AccountType.GENERIC]: <Wallet />,
};

/** Label and amount for the headline figure; a card shows what is owed as a positive amount. */
export function headline(account: Account): { label: string; value: string } {
  if (account.type === AccountType.BROKER) {
    return { label: 'Portfolio value', value: formatMoney(account.balance ?? 0) };
  }
  if (account.type === AccountType.CREDIT_CARD) {
    const balance = account.balance ?? 0;
    return balance > 0
      ? { label: 'In credit', value: formatMoney(balance) }
      : { label: 'Outstanding', value: formatMoney(Math.abs(balance)) };
  }
  return { label: 'Balance', value: formatNullableMoney(account.balance) };
}

export function AccountHeader({ account, actions }: { account: Account; actions: ReactNode }) {
  const closed = isAccountClosed(account);
  const last4 = 'last4' in account ? account.last4 : undefined;
  const sub = [TYPE_LABEL[account.type] ?? account.type, last4 ? `•••• ${last4}` : null]
    .filter(Boolean)
    .join(' · ');
  const { label, value } = headline(account);

  return (
    <section className="rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 [&>svg]:h-5 [&>svg]:w-5"
        >
          {TYPE_ICON[account.type] ?? <Wallet />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
              {account.name}
            </h1>
            {closed ? <Badge variant="secondary">Closed</Badge> : null}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
        </div>
        <div className="w-full sm:w-auto sm:text-right">
          <div className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
          <div className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">{actions}</div>
    </section>
  );
}
