'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import React from 'react';

import { ReviewTypeBadge } from '@/components/statements/StatementBadges';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatementLine } from '@/lib/statement.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface StatementLinkedTransactionsProps {
  lines: StatementLine[];
  linesSkipped: number;
}

export function StatementLinkedTransactions({
  lines,
  linesSkipped,
}: StatementLinkedTransactionsProps) {
  return (
    <div className="space-y-2 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Linked Transactions ({lines.length})
        </h3>
        {linesSkipped > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {linesSkipped} summary lines skipped during parse
          </span>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl w-full">
          No transaction rows linked to this statement.
        </div>
      ) : (
        <div className="space-y-3 w-full min-w-0">
          {/* Mobile Stack */}
          <div className="md:hidden space-y-2.5 w-full min-w-0">
            {lines.map((line) => {
              const isCredit = line.type === 'CREDIT';
              return (
                <div
                  key={line.transactionId}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 space-y-2 text-xs shadow-2xs w-full min-w-0"
                >
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="tabular-nums text-slate-400 text-2xs shrink-0 font-semibold">
                        #{line.lineIndex + 1}
                      </span>
                      <span
                        className="font-medium text-slate-900 dark:text-white break-words text-sm min-w-0"
                        title={line.description}
                      >
                        {line.description}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'tabular-nums font-bold shrink-0 text-sm ml-2',
                        isCredit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {isCredit
                        ? `+${formatMoney(line.amount)}`
                        : `-${formatMoney(line.amount)}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-xs w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-400 tabular-nums shrink-0">
                        {formatDate(line.date)}
                      </span>
                      <div className="shrink-0">
                        <ReviewTypeBadge reviewType={line.reviewType} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 tabular-nums shrink-0">
                      <span className="text-slate-400">Bal:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {line.balanceAfter !== null
                          ? formatMoney(line.balanceAfter)
                          : '—'}
                      </span>
                      {line.chainValid === null ? (
                        <span className="text-slate-400 dark:text-slate-600">
                          —
                        </span>
                      ) : line.chainValid ? (
                        <span title="Chain continuity valid">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline-block" />
                        </span>
                      ) : (
                        <span title="Chain continuity broken">
                          <XCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 inline-block" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead className="text-center w-16">Chain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const isCredit = line.type === 'CREDIT';
                  return (
                    <TableRow key={line.transactionId}>
                      <TableCell className="tabular-nums text-xs text-slate-400">
                        {line.lineIndex + 1}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(line.date)}
                      </TableCell>
                      <TableCell
                        className="text-xs font-medium max-w-xs truncate"
                        title={line.description}
                      >
                        {line.description}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        <span
                          className={
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-rose-600 dark:text-rose-400 font-semibold'
                          }
                        >
                          {isCredit
                            ? `+${formatMoney(line.amount)}`
                            : `-${formatMoney(line.amount)}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ReviewTypeBadge reviewType={line.reviewType} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {line.balanceAfter !== null
                          ? formatMoney(line.balanceAfter)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {line.chainValid === null ? (
                          <span className="text-slate-400 dark:text-slate-600">
                            —
                          </span>
                        ) : line.chainValid ? (
                          <span title="Chain continuity valid">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline-block" />
                          </span>
                        ) : (
                          <span title="Chain continuity broken">
                            <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 inline-block" />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
