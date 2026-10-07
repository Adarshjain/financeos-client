'use client';

import { CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Broker } from '@/lib/account.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { Position } from '@/lib/types';
import { cn, formatDate, parseCalendarDate } from '@/lib/utils';

import { ReconcileItemRow } from './ReconcileItemRow';
import { UnrecordedCreditsPanel } from './UnrecordedCreditsPanel';
import { useDividendReconcile } from './useDividendReconcile';

const STALE_COVERAGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function isStale(coverageEnd?: string | null): boolean {
  if (!coverageEnd) return false;
  return Date.now() - parseCalendarDate(coverageEnd).getTime() > STALE_COVERAGE_DAYS * DAY_MS;
}

interface DividendReconcilePanelProps {
  brokerAccountId?: string;
  brokerAccounts: Broker[];
  positions: Position[];
  onChanged?: () => void;
}

export function DividendReconcilePanel({
  brokerAccountId,
  brokerAccounts,
  positions,
  onChanged,
}: DividendReconcilePanelProps) {
  const r = useDividendReconcile({ brokerAccountId, onLinked: onChanged });
  const { data: accounts = [] } = useAccounts();
  const busy = r.confirmingAll || r.confirmingId !== null;

  return (
    <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Receipt matching</span>
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400">
            Bank credits that look like your unmatched dividends
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {r.items.length > 0 && (
            <Button size="sm" onClick={r.confirmAll} disabled={busy}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {r.confirmingAll ? 'Confirming...' : 'Confirm all'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => r.refetch()} disabled={r.loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', r.loading && 'animate-spin')} />
            {r.loading ? 'Searching...' : 'Find matches'}
          </Button>
        </div>
      </div>

      {!r.fetched ? (
        <p className="text-2xs text-slate-500 italic pt-1">
          Click &ldquo;Find matches&rdquo; to look for bank credits matching your unmatched dividends.
        </p>
      ) : r.items.length === 0 ? (
        <div className="space-y-1 pt-1">
          <p className="text-2xs text-slate-500 italic">No bank credits match your unmatched dividends.</p>
          {r.meta && r.meta.unresolvedCount > 0 && isStale(r.meta.coverageEnd) && (
            <p className="text-2xs text-amber-600 dark:text-amber-400">
              Your bank data stops at {formatDate(r.meta.coverageEnd)} — import a newer statement.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {r.items.map((item) => (
            <ReconcileItemRow
              key={item.dividend.id}
              item={item}
              accounts={accounts}
              selectedId={r.selected[item.dividend.id]}
              selected={r.selectedCandidate(item)}
              tdsOffered={r.tdsOffered(item)}
              recordTds={r.recordTds(item)}
              busy={busy}
              confirming={r.confirmingId === item.dividend.id}
              onSelect={(id) => r.select(item.dividend.id, id)}
              onRecordTds={(v) => r.setRecordTds(item.dividend.id, v)}
              onConfirm={() => r.confirmOne(item.dividend.id)}
            />
          ))}
        </div>
      )}

      {r.meta && (
        <p className="text-2xs text-slate-500 dark:text-slate-400">
          {r.meta.unresolvedCount} unmatched dividends · {r.meta.withCandidates} with candidates
          {r.meta.coverageEnd ? ` · Bank data through ${formatDate(r.meta.coverageEnd)}` : ''}
        </p>
      )}

      <div className="border-t border-emerald-200 dark:border-emerald-900/50 pt-3">
        <UnrecordedCreditsPanel brokerAccounts={brokerAccounts} positions={positions} onChanged={onChanged} />
      </div>
    </div>
  );
}
