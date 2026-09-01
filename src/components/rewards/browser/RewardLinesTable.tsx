'use client';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Card, CardContent } from '@/components/ui/card';
import { PagedRewardLines, REASON_META, RewardLine } from '@/lib/rewards.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { formatEarned, lineDescription } from './helpers';

interface RewardLinesTableProps {
  lines: PagedRewardLines | null;
  loading: boolean;
  onSelectLine: (line: RewardLine) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}

export function RewardLinesTable({
  lines,
  loading,
  onSelectLine,
  onPageChange,
  onSizeChange,
}: RewardLinesTableProps) {
  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
      <CardContent className="p-0">
        {/* Mobile: card list */}
        <div
          className={cn(
            'block md:hidden divide-y divide-slate-100 dark:divide-slate-800',
            loading && 'opacity-60'
          )}
        >
          {(lines?.content ?? []).length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No transactions in this range.
            </div>
          ) : (
            (lines?.content ?? []).map((line, i) => (
              <div
                key={`${line.transactionId}-${line.ruleId ?? 'none'}-${i}`}
                onClick={() => onSelectLine(line)}
                className="p-3 space-y-1.5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1.5">
                    <span>{formatDate(line.effectiveDate)}</span>
                    {line.cardLabel && (
                      <span className="text-2xs px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium">
                        {line.cardLabel}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-2xs font-semibold whitespace-nowrap',
                      REASON_META[line.reason].textClass
                    )}
                  >
                    {REASON_META[line.reason].label}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {lineDescription(line)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatMoney(line.basis)}
                    {line.basis !== line.amount &&
                      ` of ${formatMoney(line.amount)}`}
                    {line.ruleName && (
                      <span className="text-slate-400"> · {line.ruleName}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-bold whitespace-nowrap',
                      line.earned > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {line.earned > 0 ? formatEarned(line) : '—'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div
          className={cn(
            'hidden md:block overflow-x-auto',
            loading && 'opacity-60'
          )}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">
                  Date
                </th>
                <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">
                  Description
                </th>
                <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide text-right">
                  Basis
                </th>
                <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">
                  Rule
                </th>
                <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide text-right">
                  Earned
                </th>
                <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {(lines?.content ?? []).map((line, i) => (
                <tr
                  key={`${line.transactionId}-${line.ruleId ?? 'none'}-${i}`}
                  onClick={() => onSelectLine(line)}
                  className="border-b border-slate-50 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {formatDate(line.effectiveDate)}
                  </td>
                  <td className="px-3 py-2 max-w-[220px] text-slate-700 dark:text-slate-300">
                    <div className="truncate">{lineDescription(line)}</div>
                    {line.cardLabel && (
                      <span className="inline-block mt-0.5 text-2xs px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-medium">
                        {line.cardLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatMoney(line.basis)}
                    {line.basis !== line.amount && (
                      <span className="text-2xs text-slate-400 block">
                        of {formatMoney(line.amount)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                    {line.ruleName ?? '—'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-bold whitespace-nowrap',
                      line.earned > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {line.earned > 0 ? formatEarned(line) : '—'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-2xs font-semibold whitespace-nowrap',
                      REASON_META[line.reason].textClass
                    )}
                  >
                    {REASON_META[line.reason].label}
                  </td>
                </tr>
              ))}
              {(lines?.content ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-slate-400 text-xs"
                  >
                    No transactions in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Desktop pagination */}
        {lines && (
          <div className="hidden lg:block">
            <TablePagination
              page={{
                number: lines.number,
                size: lines.size,
                totalElements: lines.totalElements,
                totalPages: lines.totalPages,
              }}
              onPageChange={onPageChange}
              onSizeChange={onSizeChange}
              unit="line"
              loading={loading}
              className="border-t border-slate-100 dark:border-slate-800 px-3"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
