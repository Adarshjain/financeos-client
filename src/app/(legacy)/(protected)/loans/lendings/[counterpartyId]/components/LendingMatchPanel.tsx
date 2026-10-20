'use client';

import { CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Schemas } from '@/lib/api/types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { useLendingMatchActions } from './useLendingMatchActions';

type TransactionResponse = Schemas['TransactionResponse'];

interface LendingMatchPanelProps {
  counterpartyId: string;
}

/** Single-candidate summary row — description · account · date · signed amount,
 *  matching the "already linked" chip in TransactionPicker. */
function CandidateSummary({
  candidate,
  accounts,
}: {
  candidate: TransactionResponse;
  accounts: { id: string; name: string }[];
}) {
  const accountLabel = getAccountName(accounts, candidate.accountId);
  return (
    <div className="flex items-center justify-between gap-2 flex-1 min-w-0 text-xs">
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {candidate.description || candidate.sourcedDescription || 'Transaction'}
        </span>
        <span className="text-2xs text-slate-400 truncate">
          {accountLabel} · {formatDate(candidate.date)}
        </span>
      </div>
      <span
        className={cn(
          'font-bold tabular-nums shrink-0',
          candidate.amount >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400',
        )}
      >
        {candidate.amount >= 0 ? '+' : '-'}
        {formatMoney(Math.abs(candidate.amount))}
      </span>
    </div>
  );
}

export function LendingMatchPanel({ counterpartyId }: LendingMatchPanelProps) {
  const {
    loading,
    fetched,
    suggestions,
    selected,
    select,
    confirmOne,
    confirmAll,
    confirmingId,
    confirmingAll,
    refetch,
  } = useLendingMatchActions({ counterpartyId });
  const { data: accounts = [] } = useAccounts();

  return (
    <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Transaction Matching
            </span>
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400">
            Suggested bank transactions for unlinked entries (±₹20, ±7 days)
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {suggestions.length > 0 && (
            <Button
              size="sm"
              onClick={confirmAll}
              disabled={confirmingAll || confirmingId !== null}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {confirmingAll ? 'Confirming...' : 'Confirm All'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            {loading ? 'Searching...' : 'Find Matches'}
          </Button>
        </div>
      </div>

      {!fetched ? (
        <p className="text-2xs text-slate-500 italic pt-1">
          Click &ldquo;Find Matches&rdquo; to look for bank transactions matching unlinked
          entries.
        </p>
      ) : suggestions.length === 0 ? (
        <p className="text-2xs text-slate-500 italic pt-1">
          No matching transactions found for the unlinked entries.
        </p>
      ) : (
        <div className="space-y-2 pt-1">
          {suggestions.map((s) => {
            const chosenId = selected[s.lendingId];
            return (
              <div
                key={s.lendingId}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={s.direction === 'lent' ? 'default' : 'destructive'}
                      className="capitalize text-2xs"
                    >
                      {s.direction === 'lent' ? 'I Lent' : 'I Borrowed'}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(s.amount)}
                    </span>
                    <span className="text-2xs text-slate-500">{formatDate(s.entryDate)}</span>
                  </div>
                  {s.notes && (
                    <p className="text-2xs text-slate-500 truncate">{s.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:w-80 shrink-0">
                  {s.candidates.length === 1 ? (
                    <CandidateSummary candidate={s.candidates[0]} accounts={accounts} />
                  ) : (
                    <Select value={chosenId} onValueChange={(value) => select(s.lendingId, value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose transaction" />
                      </SelectTrigger>
                      <SelectContent>
                        {s.candidates.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.description || c.sourcedDescription || 'Transaction'} ·{' '}
                            {formatMoney(Math.abs(c.amount))} · {formatDate(c.date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="micro"
                    onClick={() => confirmOne(s.lendingId)}
                    disabled={!chosenId || confirmingId === s.lendingId || confirmingAll}
                  >
                    {confirmingId === s.lendingId ? 'Confirming...' : 'Confirm'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
