'use client';

import React from 'react';

import { RuleLinkLabel } from '@/components/rules/RuleLinkLabel';
import { Checkbox } from '@/components/ui/checkbox';
import type { CategoryRule, RuleMatchTransaction } from '@/lib/rules.types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import { MatchCategoryBadges } from './MatchCategoryBadges';

interface RuleMatchesCardListProps {
  rows: RuleMatchTransaction[];
  rule: CategoryRule;
  allSelected: boolean;
  selectedIds: Set<string>;
  pageAllChecked: boolean;
  pageSomeChecked: boolean;
  onToggleRow: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}

/** Mobile layout of the rule matches: one tappable card per transaction. */
export function RuleMatchesCardList({
  rows,
  rule,
  allSelected,
  selectedIds,
  pageAllChecked,
  pageSomeChecked,
  onToggleRow,
  onTogglePage,
}: RuleMatchesCardListProps) {
  return (
    <div className="md:hidden flex flex-col gap-2">
      <label className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <Checkbox
          checked={
            pageAllChecked ? true : pageSomeChecked ? 'indeterminate' : false
          }
          onCheckedChange={(checked) => onTogglePage(checked === true)}
          aria-label="Select all on this page"
        />
        Select this page
      </label>

      {rows.map((txn) => {
        const checked = allSelected || selectedIds.has(txn.id);
        return (
          <label
            key={txn.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900/30 text-xs cursor-pointer min-w-0',
              checked
                ? 'border-emerald-300 dark:border-emerald-800'
                : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <Checkbox
              className="mt-0.5"
              checked={checked}
              onCheckedChange={(value) => onToggleRow(txn.id, value === true)}
              aria-label="Select transaction"
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <span className="font-medium text-slate-700 dark:text-slate-300 break-words min-w-0">
                  {txn.sourcedDescription}
                </span>
                <span
                  className={cn(
                    'tabular-nums whitespace-nowrap font-semibold shrink-0',
                    txn.type === 'CREDIT'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300'
                  )}
                >
                  {txn.type === 'DEBIT' ? '-' : ''}
                  {formatCurrency(txn.amount)}
                </span>
              </div>
              <div className="flex flex-wrap items-center text-slate-500">
                <span className="tabular-nums">{formatDate(txn.date)}</span>
                <RuleLinkLabel txn={txn} ruleId={rule.id} />
              </div>
              <MatchCategoryBadges categories={txn.categories} />
            </div>
          </label>
        );
      })}
    </div>
  );
}
