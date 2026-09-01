'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { CategoryRule, RuleMatchTransaction } from '@/lib/rules.types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

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
  return (
    <div className="flex-1 overflow-y-auto min-h-[120px] rounded-xl border border-slate-200/60 dark:border-slate-800/60">
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Finding matches…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          No transactions match this rule&apos;s pattern.
        </div>
      ) : (
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
                    {txn.appliedRuleId === rule.id && (
                      <span className="ml-1.5 text-2xs text-slate-400">
                        (already this rule)
                      </span>
                    )}
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
                    <div className="flex flex-wrap gap-1">
                      {txn.categories.length === 0 ? (
                        <span className="text-slate-400 italic">
                          Uncategorized
                        </span>
                      ) : (
                        txn.categories.map((c) => (
                          <Badge
                            key={c.id}
                            variant="outline"
                            className="rounded-full px-2 py-0 text-2xs border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                          >
                            {c.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
