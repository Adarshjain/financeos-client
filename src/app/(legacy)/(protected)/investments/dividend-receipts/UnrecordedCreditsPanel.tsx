'use client';

import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Broker } from '@/lib/account.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { Position } from '@/lib/types';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { DividendDialog } from '../dialogs/DividendDialog';
import { useUnrecordedCredits } from './useUnrecordedCredits';

interface UnrecordedCreditsPanelProps {
  brokerAccounts: Broker[];
  positions: Position[];
  onChanged?: () => void;
}

export function UnrecordedCreditsPanel({ brokerAccounts, positions, onChanged }: UnrecordedCreditsPanelProps) {
  const { loading, fetched, isError, items, scan, handleRecorded } = useUnrecordedCredits({ onRecorded: onChanged });
  const { data: accounts = [] } = useAccounts();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Unrecorded dividend credits</span>
        <Button variant="outline" size="sm" onClick={() => scan()} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {loading ? 'Scanning...' : 'Scan bank credits'}
        </Button>
      </div>

      {isError && !loading ? (
        <p className="text-2xs text-rose-600 dark:text-rose-400">Could not load credits. Try again.</p>
      ) : !fetched ? (
        <p className="text-2xs text-slate-500 italic">
          Scan your bank credits for dividend-like money-in that isn&rsquo;t recorded yet.
        </p>
      ) : items.length === 0 ? (
        <p className="text-2xs text-slate-500 italic">No unrecorded dividend-like credits in the last year.</p>
      ) : (
        <div className="space-y-2">
          {items.map(({ transaction: t, holdingHints }) => {
            const prefill = {
              brokerAccounts,
              positions,
              initialAmount: t.amount,
              initialPayDate: t.date,
              linkTransactionId: t.id,
              onSuccess: handleRecorded,
            };
            return (
              <div
                key={t.id}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t.description || t.sourcedDescription || 'Transaction'}
                    </span>
                    <span className="text-2xs text-slate-400 truncate">
                      {getAccountName(accounts, t.accountId)} · {formatDate(t.date)}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums shrink-0 text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(Math.abs(t.amount))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {holdingHints.length === 0 ? (
                    <DividendDialog
                      {...prefill}
                      trigger={
                        <Button variant="outline" size="micro">
                          <Plus className="h-3 w-3" />
                          Record…
                        </Button>
                      }
                    />
                  ) : (
                    holdingHints.map((h) => (
                      <DividendDialog
                        key={h.holdingId}
                        {...prefill}
                        initialBrokerAccountId={h.brokerAccountId}
                        initialInstrumentId={h.instrumentId}
                        trigger={
                          <Button variant="outline" size="micro">
                            <Plus className="h-3 w-3" />
                            Record for {h.symbol ?? h.instrumentName} · {h.brokerName}
                          </Button>
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
