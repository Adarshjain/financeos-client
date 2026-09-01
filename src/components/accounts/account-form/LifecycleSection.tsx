'use client';

import { RotateCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Account } from '@/lib/account.types';
import { formatDate } from '@/lib/utils';

interface LifecycleSectionProps {
  account: Account;
  isSubmitting: boolean;
  isClosingAccount: boolean;
  isReopeningAccount: boolean;
  closeOnDate: string;
  setCloseOnDate: (val: string) => void;
  showCloseInline: boolean;
  setShowCloseInline: (val: boolean) => void;
  onCloseAccount: () => void;
  onReopenAccount: () => void;
}

export function LifecycleSection({
  account,
  isSubmitting,
  isClosingAccount,
  isReopeningAccount,
  closeOnDate,
  setCloseOnDate,
  showCloseInline,
  setShowCloseInline,
  onCloseAccount,
  onReopenAccount,
}: LifecycleSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 space-y-3">
      {account.closedOn ? (
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Closed on {formatDate(account.closedOn)}
            </div>
            <div className="text-2xs text-slate-500 dark:text-slate-400">
              This account is closed and hidden from standard selection pickers.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="gap-1.5 shrink-0 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            disabled={isSubmitting || isReopeningAccount}
            onClick={onReopenAccount}
          >
            <RotateCw className="w-3.5 h-3.5" />
            {isReopeningAccount ? 'Reopening...' : 'Reopen Account'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Close Account
              </div>
              <div className="text-2xs text-slate-500 dark:text-slate-400">
                Retire this account while preserving its transaction and statement history.
              </div>
            </div>
            {!showCloseInline && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="gap-1.5 shrink-0 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => setShowCloseInline(true)}
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Account
              </Button>
            )}
          </div>

          {showCloseInline && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="account-close-date" className="text-2xs font-semibold text-amber-900 dark:text-amber-200">
                    Closed On Date
                  </Label>
                  <Input
                    id="account-close-date"
                    type="date"
                    value={closeOnDate}
                    onChange={(e) => setCloseOnDate(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="flex gap-1.5 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowCloseInline(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    disabled={isClosingAccount}
                    onClick={onCloseAccount}
                  >
                    {isClosingAccount ? 'Closing...' : 'Confirm Close'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
