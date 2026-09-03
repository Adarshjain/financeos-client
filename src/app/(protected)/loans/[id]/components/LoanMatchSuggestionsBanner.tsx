'use client';

import { CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MatchSuggestionsResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

interface LoanMatchSuggestionsBannerProps {
  matchLoading: boolean;
  matchSuggestions: MatchSuggestionsResponse | null;
  onFindMatches: () => void;
  onConfirmMatch: (
    seq: number,
    date: string,
    amount: number,
    txId: string
  ) => void;
  onConfirmAllMatches: () => void;
}

export function LoanMatchSuggestionsBanner({
  matchLoading,
  matchSuggestions,
  onFindMatches,
  onConfirmAllMatches,
  onConfirmMatch,
}: LoanMatchSuggestionsBannerProps) {
  return (
    <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            EMI Transaction Matching
          </span>
        </div>
        <div className="flex gap-2">
          {matchSuggestions &&
            matchSuggestions.suggestions.some(
              (s) => s.candidates.length > 0
            ) && (
              <Button size="xs" onClick={onConfirmAllMatches}>
                <CheckCircle2 className="h-3 w-3" /> Confirm All
              </Button>
            )}
          <Button
            variant="outline"
            size="xs"
            onClick={onFindMatches}
            disabled={matchLoading}
          >
            <RefreshCw
              className={`h-3 w-3 ${matchLoading ? 'animate-spin' : ''}`}
            />
            {matchLoading ? 'Searching...' : 'Find Matches'}
          </Button>
        </div>
      </div>

      {matchSuggestions && (
        <div className="space-y-2 text-xs pt-1">
          {matchSuggestions.suggestions.every(
            (s) => s.candidates.length === 0
          ) ? (
            <p className="text-slate-500 italic">
              No matching bank transactions found for due or overdue
              installments.
            </p>
          ) : (
            matchSuggestions.suggestions
              .filter((s) => s.candidates.length > 0)
              .map((s) => (
                <div
                  key={s.installmentSeq}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5"
                >
                  <div className="flex justify-between font-medium">
                    <span>
                      Installment #{s.installmentSeq} · Due{' '}
                      {formatDate(s.dueDate)}
                    </span>
                    <span className="text-emerald-600 font-bold">
                      EMI: {formatMoney(s.expectedAmount)}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1">
                    {s.candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 text-xs"
                      >
                        <span>
                          {formatDate(cand.date)} ·{' '}
                          {cand.description || 'DEBIT'} (
                          {formatMoney(Math.abs(cand.amount))})
                        </span>
                        <Button
                          size="micro"
                          onClick={() =>
                            onConfirmMatch(
                              s.installmentSeq,
                              cand.date,
                              Math.abs(cand.amount),
                              cand.id
                            )
                          }
                        >
                          Confirm
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
