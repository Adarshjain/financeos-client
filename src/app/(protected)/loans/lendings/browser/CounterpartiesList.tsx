'use client';

import { ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Page } from '@/lib/pagination';
import { CounterpartyResponse } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface CounterpartiesListProps {
  page: Page<CounterpartyResponse>;
  filteredContent: CounterpartyResponse[];
  onPageChange: (newPage: number) => void;
  onDeleteCp: (cp: CounterpartyResponse) => void;
}

export function CounterpartiesList({
  page,
  filteredContent,
  onPageChange,
  onDeleteCp,
}: CounterpartiesListProps) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Mobile View: Flat List */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredContent.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No counterparties found.
          </div>
        ) : (
          filteredContent.map((cp) => (
            <div
              key={cp.id}
              className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                  className="cursor-pointer flex-1"
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {cp.name}
                  </div>
                  {cp.notes && (
                    <div className="text-xs text-slate-500 truncate max-w-xs">
                      {cp.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-2xs">
                    {cp.entryCount} entries
                  </Badge>
                  <ConfirmationDialog
                    title="Delete Counterparty"
                    description={`Delete ${cp.name}? This permanently deletes their entire ledger history (${cp.entryCount} entries).`}
                    primaryAction={() => onDeleteCp(cp)}
                    primaryActionText="Delete Person"
                    variant="destructive"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-slate-400 hover:text-rose-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <ChevronRight
                    className="h-4 w-4 text-slate-400 cursor-pointer"
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                  />
                </div>
              </div>

              <div
                onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                className="grid grid-cols-3 gap-2 text-xs pt-1 cursor-pointer"
              >
                <div>
                  <span className="text-slate-500 block text-2xs">
                    Total Lent
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                    {cp.totalLent > 0 ? formatMoney(cp.totalLent) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">
                    Total Borrowed
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                    {cp.totalBorrowed > 0 ? formatMoney(cp.totalBorrowed) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">
                    Net Position
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      cp.netPosition > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : cp.netPosition < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {cp.netPosition > 0 ? '+' : ''}
                    {formatMoney(cp.netPosition)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Clean Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider text-2xs">
              <th className="py-3 px-4">Person / Counterparty</th>
              <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                Total Lent
              </th>
              <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                Total Borrowed
              </th>
              <th className="py-3 px-4 text-right">Net Position</th>
              <th className="py-3 px-4 text-center">Entries</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredContent.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No counterparties found.
                </td>
              </tr>
            ) : (
              filteredContent.map((cp) => (
                <tr
                  key={cp.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    {cp.name}
                    {cp.notes && (
                      <div className="text-xs font-normal text-slate-500 truncate max-w-xs">
                        {cp.notes}
                      </div>
                    )}
                  </td>
                  <td
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums cursor-pointer"
                  >
                    {cp.totalLent > 0 ? formatMoney(cp.totalLent) : '—'}
                  </td>
                  <td
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums cursor-pointer"
                  >
                    {cp.totalBorrowed > 0 ? formatMoney(cp.totalBorrowed) : '—'}
                  </td>
                  <td
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="py-3.5 px-4 text-right font-extrabold tabular-nums cursor-pointer"
                  >
                    <span
                      className={
                        cp.netPosition > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : cp.netPosition < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }
                    >
                      {cp.netPosition > 0 ? '+' : ''}
                      {formatMoney(cp.netPosition)}
                    </span>
                  </td>
                  <td
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="py-3.5 px-4 text-center cursor-pointer"
                  >
                    <Badge variant="outline" className="text-2xs">
                      {cp.entryCount} entries
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <ConfirmationDialog
                      title="Delete Counterparty"
                      description={`Delete ${cp.name}? This permanently deletes their entire ledger history (${cp.entryCount} entries).`}
                      primaryAction={() => onDeleteCp(cp)}
                      primaryActionText="Delete Person"
                      variant="destructive"
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-slate-400 hover:text-rose-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <TablePagination page={page} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
