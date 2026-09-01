'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { REASON_META, RewardLine } from '@/lib/rewards.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { formatEarned, lineDescription } from './helpers';

interface RewardLineDetailDialogProps {
  selectedLine: RewardLine | null;
  onClose: () => void;
}

export function RewardLineDetailDialog({
  selectedLine,
  onClose,
}: RewardLineDetailDialogProps) {
  return (
    <Dialog
      open={!!selectedLine}
      onOpenChange={(o) => !o && onClose()}
    >
      <DialogContent className="sm:max-w-[420px]">
        {selectedLine && (
          <>
            <DialogHeader>
              <DialogTitle className="text-sm">Reward Calculation</DialogTitle>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-2 text-xs">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-1.5">
                <p className="font-semibold text-slate-700 dark:text-slate-200 break-words">
                  {lineDescription(selectedLine)}
                </p>
                {selectedLine.description &&
                  selectedLine.sourcedDescription &&
                  selectedLine.description !==
                    selectedLine.sourcedDescription && (
                    <p className="text-2xs text-slate-400 break-words">
                      {selectedLine.sourcedDescription}
                    </p>
                  )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1">
                  <span className="text-slate-400">Transaction date</span>
                  <span className="text-right font-semibold text-slate-700 dark:text-slate-300">
                    {formatDate(selectedLine.transactionDate)}
                  </span>
                  {selectedLine.effectiveDate !==
                    selectedLine.transactionDate && (
                    <>
                      <span className="text-slate-400">
                        Settled (used for rewards)
                      </span>
                      <span className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        {formatDate(selectedLine.effectiveDate)}
                      </span>
                    </>
                  )}
                  <span className="text-slate-400">Amount charged</span>
                  <span className="text-right font-semibold text-slate-700 dark:text-slate-300">
                    {formatMoney(selectedLine.amount)}
                  </span>
                  {selectedLine.basis !== selectedLine.amount && (
                    <>
                      <span className="text-slate-400">
                        Eligible after refunds
                      </span>
                      <span className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(selectedLine.basis)}
                      </span>
                    </>
                  )}
                  {selectedLine.mcc && (
                    <>
                      <span className="text-slate-400">MCC</span>
                      <span className="text-right font-mono text-slate-700 dark:text-slate-300">
                        {selectedLine.mcc}
                      </span>
                    </>
                  )}
                  {selectedLine.channel && (
                    <>
                      <span className="text-slate-400">Channel</span>
                      <span className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        {selectedLine.channel}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs">Rule</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedLine.ruleName ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs">Earned</span>
                  <span
                    className={cn(
                      'font-bold',
                      selectedLine.earned > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400'
                    )}
                  >
                    {selectedLine.earned > 0
                      ? formatEarned(selectedLine)
                      : '—'}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs font-medium pt-1 border-t border-slate-100 dark:border-slate-800/60',
                    REASON_META[selectedLine.reason].textClass
                  )}
                >
                  {REASON_META[selectedLine.reason].label} —{' '}
                  {REASON_META[selectedLine.reason].explain}
                </p>
              </div>
              <p className="text-2xs text-slate-300 dark:text-slate-600 font-mono break-all">
                txn {selectedLine.transactionId}
              </p>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
