import { AlertCircle, Anchor, CheckCircle2 } from 'lucide-react';
import React from 'react';

import { Account, BankAccount } from '@/lib/account.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface BalanceProvenanceProps {
  account: Account;
}

export function BalanceProvenance({ account }: BalanceProvenanceProps) {
  const isAnchored = Boolean(account.anchorStatementId);
  const balanceToDisplay =
    account.anchoredBalance !== undefined && account.anchoredBalance !== null
      ? account.anchoredBalance
      : (account as BankAccount).openingBalance ?? 0;

  if (isAnchored) {
    return (
      <div className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Anchor className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Anchored Balance
          </span>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
            {formatMoney(balanceToDisplay)}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 justify-between">
          <span>
            As of statement <span className="font-semibold text-slate-600 dark:text-slate-350">{formatDate(account.anchorDate)}</span>
          </span>
          <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
            +{account.unreconciledTransactionCount || 0} since
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
          Balance
        </span>
        <span className="text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
          {formatMoney(balanceToDisplay)}
        </span>
      </div>
      <div className="text-[10px] text-amber-600 dark:text-amber-400/90 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0" />
        <span>Unanchored — upload statement to anchor</span>
      </div>
    </div>
  );
}
