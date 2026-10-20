import { CreditCard as CardIcon, FileText } from 'lucide-react';
import Link from 'next/link';

import { CardsDialog } from '@/components/accounts/CardsDialog';
import { StatementsDialog } from '@/components/accounts/StatementsDialog';
import { Account, isAccountClosed, supportsIngestion } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AccountWrapper({
  account,
  children,
}: {
  account: Account;
  children: React.ReactNode;
}) {
  const isClosed = isAccountClosed(account);
  // Statements exist only for account types that can ingest (bank, credit card); cards are a
  // bank/credit-card concept too. Brokers and Wallet/Cash accounts get no actions row at all.
  const showStatements = supportsIngestion(account.type);
  const showCards =
    account.type === AccountType.CREDIT_CARD || account.type === AccountType.BANK_ACCOUNT;
  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/50 hover:-translate-y-0.5 transition-all duration-300 flex w-full flex-col overflow-hidden',
        isClosed && 'opacity-65 bg-slate-50/50 dark:bg-slate-950/20'
      )}
    >
      {/* Body navigates to the account hub; editing lives there. */}
      <Link
        href={`/accounts/${account.id}`}
        className="p-3.5 flex-1 flex flex-col justify-between gap-2 text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none"
      >
        {children}
      </Link>

      {/* Actions Row: Only Statements and Cards */}
      {showStatements || showCards ? (
      <div className="flex border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 divide-x divide-slate-100 dark:divide-slate-800/65">
        {showStatements ? (
        <StatementsDialog
          account={account}
          trigger={
            <button
              type="button"
              suppressHydrationWarning
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
            >
              <FileText className="w-3.5 h-3.5" />
              Statements
            </button>
          }
        />
        ) : null}
        {showCards ? (
          <CardsDialog
            account={account}
            trigger={
              <button
                type="button"
                suppressHydrationWarning
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
              >
                <CardIcon className="w-3.5 h-3.5" />
                Cards
              </button>
            }
          />
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
