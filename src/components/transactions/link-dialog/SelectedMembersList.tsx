'use client';

import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Account } from '@/lib/account.types';
import { getDerivedRoleLabel } from '@/lib/transaction.helpers';
import { LinkType, Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface SelectedMembersListProps {
  selectedTransactions: Transaction[];
  anchorId: string;
  setAnchorId: (id: string) => void;
  linkType: LinkType;
  getAccount: (id: string) => Account | undefined;
  onRemoveTransaction: (t: Transaction) => void;
}

export function SelectedMembersList({
  selectedTransactions,
  anchorId,
  setAnchorId,
  linkType,
  getAccount,
  onRemoveTransaction,
}: SelectedMembersListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Selected Transactions ({selectedTransactions.length})
        </Label>
        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
          Select 1 Parent (Anchor) transaction
        </span>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {selectedTransactions.map((t) => {
          const isAnchor = t.id === anchorId;
          const acc = getAccount(t.accountId);
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all',
                isAnchor
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 dark:border-indigo-600'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <input
                  type="radio"
                  name="anchor"
                  checked={isAnchor}
                  onChange={() => setAnchorId(t.id)}
                  className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  title="Set as Parent (Anchor)"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {t.description || t.sourcedDescription}
                  </span>
                  <div className="flex items-center gap-2 text-2xs text-slate-400">
                    <span>{formatDate(t.date)}</span>
                    <span>•</span>
                    <span>{acc?.name || 'Unknown Account'}</span>
                    {isAnchor ? (
                      <Badge className="text-2xs py-0 px-1.5 h-4 bg-indigo-100 text-indigo-800 font-bold dark:bg-indigo-900/80 dark:text-indigo-200">
                        Parent • {getDerivedRoleLabel(linkType, true)}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-2xs py-0 px-1.5 h-4 text-slate-500 dark:text-slate-400"
                      >
                        {getDerivedRoleLabel(linkType, false)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemoveTransaction(t)}
                  className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
