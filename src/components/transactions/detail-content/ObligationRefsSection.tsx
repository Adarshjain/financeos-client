'use client';

import { ExternalLink, HandCoins, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import type { ObligationRef } from '@/lib/transaction.types';
import { formatMoney } from '@/lib/utils';

interface ObligationRefsSectionProps {
  refs: ObligationRef[];
  unlinkingId: string | null;
  onUnlinkLending: (lendingId: string) => void;
  onUnlinkLoanPayment: (loanId: string, paymentId: string) => void;
  /** Omit the section's own header when it's nested inside a shared "Links" heading. */
  hideHeader?: boolean;
}

export function ObligationRefsSection({
  refs,
  unlinkingId,
  onUnlinkLending,
  onUnlinkLoanPayment,
  hideHeader = false,
}: ObligationRefsSectionProps) {
  if (refs.length === 0) return null;

  return (
    <div className="space-y-2 pt-1">
      {!hideHeader && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <HandCoins className="h-3.5 w-3.5 text-indigo-500" /> Loan / Lending
          </span>
        </div>
      )}

      {refs.map((ref) => {
        const href = ref.parentId
          ? ref.kind === 'LENDING'
            ? `/loans/lendings/${ref.parentId}`
            : `/loans/${ref.parentId}`
          : null;
        const isUnlinking = unlinkingId === ref.id;

        return (
          <div
            key={`${ref.kind}-${ref.id}`}
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-950/10"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {ref.label}
              </span>
              {ref.amount != null && (
                <span className="text-2xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatMoney(ref.amount)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {href && (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 h-6 rounded-md px-2 text-2xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Link>
              )}
              {ref.kind === 'LENDING' && (
                <Button
                  variant="ghost-destructive"
                  size="micro"
                  onClick={() => onUnlinkLending(ref.id)}
                  disabled={isUnlinking}
                >
                  {isUnlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Unlink
                </Button>
              )}
              {ref.kind === 'LOAN_PAYMENT' && ref.parentId && (
                <ConfirmationDialog
                  title="Remove this settlement?"
                  description="The installment goes back to unpaid; the transaction stays."
                  primaryActionText="Unlink"
                  variant="destructive"
                  loading={isUnlinking}
                  primaryAction={() => onUnlinkLoanPayment(ref.parentId as string, ref.id)}
                  trigger={
                    <Button variant="ghost-destructive" size="micro" disabled={isUnlinking}>
                      {isUnlinking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Unlink
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
