'use client';

import { ChevronRight } from 'lucide-react';

import { StatementVerdictBadge } from '@/components/statements/StatementBadges';
import { Button } from '@/components/ui/button';
import { StatementSummary } from '@/lib/statement.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface StatementsMobileListProps {
  statements: StatementSummary[];
  onSelectStatement: (statementId: string) => void;
}

export function StatementsMobileList({
  statements,
  onSelectStatement,
}: StatementsMobileListProps) {
  return (
    <div className="md:hidden space-y-3 pr-1">
      {statements.map((s) => (
        <div
          key={s.id}
          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3 shadow-2xs"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                  {s.source === 'file_upload' ? 'Upload' : s.source === 'gmail' ? 'Email' : s.source}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <StatementVerdictBadge verdict={s.verdict} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-2xs text-slate-400 block">Opening</span>
              <span className="tabular-nums text-slate-700 dark:text-slate-300">
                {s.openingBalance !== null ? formatMoney(s.openingBalance) : '—'}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Closing</span>
              <span className="tabular-nums font-bold text-slate-900 dark:text-white">
                {s.closingBalance !== null ? formatMoney(s.closingBalance) : '—'}
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {s.transactionCount !== null && s.transactionCount !== undefined
                ? `${s.transactionCount} transactions`
                : 'No transactions linked'}
            </span>
            <Button variant="outline" onClick={() => onSelectStatement(s.id)}>
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
