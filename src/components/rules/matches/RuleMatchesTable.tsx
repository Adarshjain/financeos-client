'use client';

import React from 'react';

import { RuleLinkLabel } from '@/components/rules/RuleLinkLabel';
import { Checkbox } from '@/components/ui/checkbox';
import type { CategoryRule, RuleMatchTransaction } from '@/lib/rules.types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import { MatchCategoryBadges } from './MatchCategoryBadges';
import { RuleMatchesCardList } from './RuleMatchesCardList';

interface RuleMatchesTableProps {
  loading: boolean;
  rows: RuleMatchTransaction[];
  rule: CategoryRule;
  allSelected: boolean;
  selectedIds: Set<string>;
  pageAllChecked: boolean;
  pageSomeChecked: boolean;
  onToggleRow: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}

export function RuleMatchesTable({
  loading,
  rows,
  rule,
  allSelected,
  selectedIds,
  pageAllChecked,
  pageSomeChecked,
  onToggleRow,
  onTogglePage,
}: RuleMatchesTableProps) {
  if (loading || rows.length === 0) {
    return (
      <div className="flex-1 min-h-[120px] rounded-xl border border-slate-200/60 dark:border-slate-800/60 py-10 text-center text-sm text-slate-400">
        {loading ? (
          'Finding matches…'
        ) : (
          <>No transactions match this rule&apos;s pattern.</>
        )}
      </div>
    );
  }

  return (
    <>
      <RuleMatchesCardList
        rows={rows}
        rule={rule}
        allSelected={allSelected}
        selectedIds={selectedIds}
        pageAllChecked={pageAllChecked}
        pageSomeChecked={pageSomeChecked}
        onToggleRow={onToggleRow}
        onTogglePage={onTogglePage}
      />
      <div className="hidden md:block flex-1 overflow-y-auto min-h-[120px] rounded-xl border border-slate-200/60 dark:border-slate-800/60">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr className="text-left">
              <th className="p-2 w-8">
                <Checkbox
                  checked={
                    pageAllChecked
                      ? true
                      : pageSomeChecked
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={(checked) => onTogglePage(checked === true)}
                  aria-label="Select all on this page"
                />
              </th>
              <th className="p-2 whitespace-nowrap">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2 text-right whitespace-nowrap">Amount</th>
              <th className="p-2">Current categories</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((txn) => {
              const checked = allSelected || selectedIds.has(txn.id);
              return (
                <tr
                  key={txn.id}
                  className="border-t border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                >
                  <td className="p-2 align-top">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        onToggleRow(txn.id, value === true)
                      }
                      aria-label="Select transaction"
                    />
                  </td>
                  <td className="p-2 align-top whitespace-nowrap tabular-nums text-slate-500">
                    {formatDate(txn.date)}
                  </td>
                  <td className="p-2 align-top text-slate-700 dark:text-slate-300 break-all">
                    {txn.sourcedDescription}
                    <RuleLinkLabel txn={txn} ruleId={rule.id} />
                  </td>
                  <td
                    className={cn(
                      'p-2 align-top text-right tabular-nums whitespace-nowrap font-medium',
                      txn.type === 'CREDIT'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {txn.type === 'DEBIT' ? '-' : ''}
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="p-2 align-top">
                    <MatchCategoryBadges categories={txn.categories} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
