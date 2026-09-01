'use client';

import { ArrowDownLeft, ArrowUpRight, Edit2, Plus, Trash2 } from 'lucide-react';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LendingResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

export interface LendingEntryWithBalance extends LendingResponse {
  runningBalance: number;
}

interface CounterpartyLedgerTableProps {
  cpName: string;
  entries: LendingEntryWithBalance[];
  onOpenAddEntry: () => void;
  onOpenEditEntry: (entry: LendingResponse) => void;
  onDeleteEntry: (id: string) => void;
}

export function CounterpartyLedgerTable({
  cpName,
  entries,
  onOpenAddEntry,
  onOpenEditEntry,
  onDeleteEntry,
}: CounterpartyLedgerTableProps) {
  return (
    <>
      {/* Mobile View: Standalone Cards */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Ledger History ({entries.length})
          </h2>
          <Button size="sm" onClick={onOpenAddEntry}>
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </Button>
        </div>

        {entries.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
            No ledger entries recorded for {cpName}.
          </Card>
        ) : (
          entries.map((item) => (
            <Card
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {formatDate(item.entryDate)}
                </span>
                <span
                  className={`font-bold text-sm tabular-nums ${
                    item.direction === 'lent'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {item.direction === 'lent' ? '-' : ''}
                  {formatMoney(item.amount)}
                </span>
              </div>

              {item.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                  {item.notes}
                </p>
              )}
              {item.expectedReturnDate && (
                <p className="text-xs text-slate-500">
                  Expected Return:{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatDate(item.expectedReturnDate)}
                  </span>
                </p>
              )}

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-2xs block font-medium">
                    Running Balance
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      item.runningBalance > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : item.runningBalance < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.runningBalance > 0 ? '+' : ''}
                    {formatMoney(item.runningBalance)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onOpenEditEntry(item)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <ConfirmationDialog
                    title="Delete Ledger Entry"
                    description={`Delete this ${item.direction} entry of ${formatMoney(
                      item.amount
                    )}?`}
                    primaryAction={() => onDeleteEntry(item.id)}
                    primaryActionText="Delete Entry"
                    variant="destructive"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View: Ledger Container Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Ledger History ({entries.length} entries)
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No ledger entries recorded for {cpName}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                  <th className="py-3 px-4">Expected Return</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {entries.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatDate(item.entryDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          item.direction === 'lent' ? 'default' : 'destructive'
                        }
                        className="capitalize text-2xs inline-flex items-center gap-1"
                      >
                        {item.direction === 'lent' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3" />
                        )}
                        {item.direction === 'lent' ? 'I Lent' : 'I Borrowed'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold tabular-nums">
                      <span
                        className={
                          item.runningBalance > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.runningBalance < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500'
                        }
                      >
                        {item.runningBalance > 0 ? '+' : ''}
                        {formatMoney(item.runningBalance)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {item.expectedReturnDate
                        ? formatDate(item.expectedReturnDate)
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {item.notes ?? '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onOpenEditEntry(item)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmationDialog
                          title="Delete Ledger Entry"
                          description={`Delete this ${
                            item.direction
                          } entry of ${formatMoney(item.amount)}?`}
                          primaryAction={() => onDeleteEntry(item.id)}
                          primaryActionText="Delete Entry"
                          variant="destructive"
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
