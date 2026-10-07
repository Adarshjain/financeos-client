'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/transaction.types';

import { ReviewTransactionDialog } from './ReviewTransactionDialog';

interface ReviewTransactionProps {
  transaction: Transaction;
  /** Called after the transaction was successfully marked as reviewed. */
  onSuccess?: () => void;
}

/**
 * Single-transaction counterpart to the batch approve flow on
 * `/transactions/review`. Renders nothing unless the transaction actually needs
 * review, so callers can drop it in unconditionally.
 *
 * The backend never flags a transaction for review without at least one reason,
 * so there is nothing to approve when the list is empty. Rather than guess at
 * what a reason-less approval should clear, the action simply isn't offered —
 * data that violates the invariant can't produce a request whose meaning is
 * undefined.
 */
export const ReviewTransaction = ({ transaction, onSuccess }: ReviewTransactionProps) => {
  const [open, setOpen] = useState(false);

  const reasons = transaction.reviewReasons ?? [];
  if (transaction.reviewType !== 'NEEDS_REVIEW' || reasons.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 w-full text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-350"
      >
        <Check className="h-3.5 w-3.5" />
        Review
      </Button>

      <ReviewTransactionDialog
        transaction={transaction}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  );
};
