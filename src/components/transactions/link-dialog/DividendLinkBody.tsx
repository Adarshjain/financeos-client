'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { expectedNet } from './dividendLinkHelpers';
import { DividendNewFields } from './DividendNewFields';
import type { UseDividendLinkResult } from './useDividendLink';

interface DividendLinkBodyProps {
  transaction: Transaction;
  accounts: Account[];
  dividend: UseDividendLinkResult;
}

const STATUS_STYLES: Record<string, string> = {
  awaiting: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  unverifiable: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

/** Body for the DIVIDEND link kind: pick an unmatched dividend, or record a new one. */
export function DividendLinkBody({ transaction, accounts, dividend }: DividendLinkBodyProps) {
  const { mode, setMode } = dividend;

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-0.5">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
          {transaction.description ?? transaction.sourcedDescription}
        </div>
        <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
          <span>
            {getAccountName(accounts, transaction.accountId)} · {formatDate(transaction.date)}
          </span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatMoney(Math.abs(transaction.amount))}
          </span>
        </div>
      </div>

      <div role="group" aria-label="Dividend mode" className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
        {(['existing', 'new'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'h-7 rounded-md text-xs font-semibold transition-colors',
              mode === m
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {m === 'existing' ? 'Existing dividend' : 'New dividend'}
          </button>
        ))}
      </div>

      {mode === 'new' ? (
        <DividendNewFields link={dividend} />
      ) : (
        <div className="space-y-2">
          <Input
            value={dividend.search}
            onChange={(e) => dividend.setSearch(e.target.value)}
            placeholder="Search symbol, instrument or broker"
            aria-label="Search dividends"
            className="h-9 text-xs"
          />

          {dividend.loadingDividends ? (
            <p className="text-2xs text-slate-400 px-1">Loading dividends...</p>
          ) : dividend.dividends.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-3 text-center">
              No unmatched dividends. Record a new one instead.
            </p>
          ) : (
            <div role="radiogroup" aria-label="Unmatched dividends" className="space-y-1.5">
              {dividend.dividends.map((d) => {
                const checked = dividend.selectedId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => dividend.setSelectedId(d.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-colors',
                      checked
                        ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-950/30'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {d.symbol || d.instrumentName}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                        {d.brokerName} · {formatDate(d.exDate ?? d.payDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'text-2xs font-bold px-1.5 rounded border capitalize',
                          STATUS_STYLES[d.receiptStatus],
                        )}
                      >
                        {d.receiptStatus}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatMoney(expectedNet(d))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {dividend.tdsGap !== null && (
            <div className="flex items-center space-x-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <Checkbox
                id="record-tds"
                checked={dividend.recordTds}
                onCheckedChange={(c) => dividend.setRecordTds(!!c)}
              />
              <label
                htmlFor="record-tds"
                className="text-xs font-medium text-indigo-900 dark:text-indigo-200 cursor-pointer"
              >
                Record TDS of {formatMoney(dividend.tdsGap)}
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
