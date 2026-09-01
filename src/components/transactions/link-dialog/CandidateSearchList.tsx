'use client';

import { Loader2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Account } from '@/lib/account.types';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface CandidateSearchListProps {
  candidateSearch: string;
  setCandidateSearch: (search: string) => void;
  loadingCandidates: boolean;
  filteredCandidates: Transaction[];
  getRuleHint: () => string;
  getAccount: (id: string) => Account | undefined;
  onAddTransaction: (t: Transaction) => void;
}

export function CandidateSearchList({
  candidateSearch,
  setCandidateSearch,
  loadingCandidates,
  filteredCandidates,
  getRuleHint,
  getAccount,
  onAddTransaction,
}: CandidateSearchListProps) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Find Counterpart Transactions
      </Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={candidateSearch}
          onChange={(e) => setCandidateSearch(e.target.value)}
          placeholder="Search by description or amount..."
          className="pl-9 h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {loadingCandidates ? (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-6 px-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              No matching counterpart transactions found
            </p>
            <p className="text-xs text-slate-400 italic">{getRuleHint()}</p>
          </div>
        ) : (
          filteredCandidates.map((t) => {
            const acc = getAccount(t.accountId);
            return (
              <div
                key={t.id}
                onClick={() => onAddTransaction(t)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors text-xs"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {t.description || t.sourcedDescription}
                  </span>
                  <div className="flex items-center gap-2 text-2xs text-slate-400">
                    <span>{formatDate(t.date)}</span>
                    <span>•</span>
                    <span>{acc?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      t.amount >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {t.amount >= 0 ? '+' : '-'}
                    {formatMoney(Math.abs(t.amount))}
                  </span>
                  <Button variant="outline" size="micro">
                    Add
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
