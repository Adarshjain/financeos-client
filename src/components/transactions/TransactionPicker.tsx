'use client';

import { Loader2, Search, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { type PickerTransaction, useTransactionPicker } from './useTransactionPicker';

/** Minimal shape both a `LendingTransactionSummary` and a full `Transaction`
 *  satisfy — enough to render the selected chip regardless of which one the
 *  caller currently has in hand. */
interface PickerSummaryLike {
  id: string;
  description?: string | null;
  sourcedDescription?: string | null;
  date: string;
  accountId: string;
  accountName?: string | null;
  signedAmount?: number;
  amount?: number;
}

interface TransactionPickerProps {
  value: PickerSummaryLike | null;
  onSelect: (t: Transaction) => void;
  onClear: () => void;
  direction?: 'lent' | 'borrowed';
  /** Overrides the direction-derived type filter; `null` disables the type
   *  filter entirely. See `useTransactionPicker`. */
  type?: 'DEBIT' | 'CREDIT' | null;
  /** Loan links are exclusive — hide rows carrying ANY obligation ref (loan
   *  or lending) and suppress the "also linked to N ledger entries" hint,
   *  which only makes sense under the default lending (LENDING-shared-ok)
   *  rule. */
  excludeAnyObligationRef?: boolean;
  /** Overrides the default direction-derived empty-state hint text. */
  ruleHint?: string;
  suggestAmount?: number | null;
  suggestDate?: string | null;
  excludeIds?: string[];
  disabled?: boolean;
}

function defaultRuleHint(direction?: 'lent' | 'borrowed') {
  if (direction === 'lent') return 'Lent entries link money-out (debit) transactions.';
  if (direction === 'borrowed') return 'Borrowed entries link money-in (credit) transactions.';
  return '';
}

function signedAmountOf(v: PickerSummaryLike): number {
  return v.signedAmount ?? v.amount ?? 0;
}

export function TransactionPicker({
  value,
  onSelect,
  onClear,
  direction,
  type,
  excludeAnyObligationRef = false,
  ruleHint: ruleHintProp,
  suggestAmount,
  suggestDate,
  excludeIds,
  disabled,
}: TransactionPickerProps) {
  const [changing, setChanging] = React.useState(false);
  const { data: accounts = [] } = useAccounts();

  const showSearch = !value || changing;

  // Browsing for a replacement shouldn't re-offer the transaction already
  // sitting behind the chip — that's what cancelling "Change" is for.
  const effectiveExcludeIds = React.useMemo(() => {
    if (!value || !changing) return excludeIds;
    return [...(excludeIds ?? []), value.id];
  }, [excludeIds, value, changing]);

  const { search, setSearch, loading, candidates } = useTransactionPicker({
    direction,
    type,
    suggestAmount,
    suggestDate,
    excludeIds: effectiveExcludeIds,
    excludeAnyObligationRef,
    active: showSearch && !disabled,
  });

  const handleSelect = (t: PickerTransaction) => {
    onSelect(t);
    setChanging(false);
    setSearch('');
  };

  if (!showSearch && value) {
    const amount = signedAmountOf(value);
    const accountLabel = value.accountName || getAccountName(accounts, value.accountId);
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {value.description || value.sourcedDescription || 'Transaction'}
          </span>
          <span className="text-2xs text-slate-400 truncate">
            {accountLabel} · {formatDate(value.date)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            title={`${amount >= 0 ? '+' : '-'}${formatMoney(Math.abs(amount))}`}
            className={cn(
              'font-bold tabular-nums',
              amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
            )}
          >
            {amount >= 0 ? '+' : '-'}
            {formatMoney(Math.abs(amount))}
          </span>
          {!disabled && (
            <>
              <Button type="button" variant="ghost" size="micro" onClick={() => setChanging(true)}>
                Change
              </Button>
              <Button type="button" variant="ghost-destructive" size="micro" onClick={onClear}>
                Remove
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by description or amount..."
          disabled={disabled}
          className={cn('pl-9 h-9 text-xs', value && changing && 'pr-9')}
        />
        {value && changing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1 top-1"
            onClick={() => setChanging(false)}
            aria-label="Cancel change"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-6 px-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">No matching transactions</p>
            <p className="text-xs text-slate-400 italic">{ruleHintProp ?? defaultRuleHint(direction)}</p>
          </div>
        ) : (
          candidates.map((t) => {
            const accountLabel = getAccountName(accounts, t.accountId);
            const splitCount = t.obligationRefs?.length ?? 0;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-xs"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {t.description || t.sourcedDescription}
                  </span>
                  <div className="flex items-center gap-2 text-2xs text-slate-400">
                    <span>{accountLabel}</span>
                    <span>•</span>
                    <span>{formatDate(t.date)}</span>
                  </div>
                  {!excludeAnyObligationRef && splitCount > 0 && (
                    <span className="text-2xs text-indigo-500 dark:text-indigo-400">
                      also linked to {splitCount} ledger entr{splitCount === 1 ? 'y' : 'ies'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {t.amount >= 0 ? '+' : '-'}
                    {formatMoney(Math.abs(t.amount))}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="micro"
                    disabled={disabled}
                    onClick={() => handleSelect(t)}
                  >
                    Select
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
