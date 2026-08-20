'use client';

import {AlertTriangle, Check, Info, Loader2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {mergeTransactions} from '@/actions/transactions';
import {REVIEW_REASON_META, reviewReasonLabel} from '@/components/transactions/catalog';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {Account} from '@/lib/account.types';
import type {Category} from '@/lib/categories.types';
import type {Transaction, TransactionSource} from '@/lib/transaction.types';
import {cn, formatCurrency, formatDate} from '@/lib/utils';

interface MergeTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tx1: Transaction;
  tx2: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess: () => void;
}

function getSourcePriorityScore(source: TransactionSource): number {
  switch (source) {
    case 'gmail_statement':
      return 4;
    case 'file_upload':
      return 3;
    case 'gmail_transaction_alert':
      return 2;
    case 'manual':
      return 1;
    default:
      return 0;
  }
}

function getSourceLabel(source: TransactionSource): string {
  switch (source) {
    case 'gmail_statement':
      return 'Gmail Statement';
    case 'file_upload':
      return 'File Upload';
    case 'gmail_transaction_alert':
      return 'Gmail Alert';
    case 'manual':
      return 'Manual';
    default:
      return source;
  }
}

export function MergeTransactionsDialog({
                                          open,
                                          onOpenChange,
                                          tx1,
                                          tx2,
                                          accounts,
                                          categories,
                                          onSuccess,
                                        }: MergeTransactionsDialogProps) {
  const [keepId, setKeepId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tx1 && tx2) {
      const score1 = getSourcePriorityScore(tx1.source);
      const score2 = getSourcePriorityScore(tx2.source);

      if (score1 > score2) {
        setKeepId(tx1.id);
      } else if (score2 > score1) {
        setKeepId(tx2.id);
      } else {
        const time1 = new Date(tx1.createdAt || tx1.date).getTime();
        const time2 = new Date(tx2.createdAt || tx2.date).getTime();
        if (time1 <= time2) {
          setKeepId(tx1.id);
        } else {
          setKeepId(tx2.id);
        }
      }
    }
  }, [open, tx1, tx2]);

  if (!tx1 || !tx2) return null;

  const deleteId = keepId === tx1.id ? tx2.id : tx1.id;
  const isDifferentAccount = tx1.accountId !== tx2.accountId;
  // Amounts are signed (debit negative, credit positive), so opposite signs mean
  // opposite directions — usually a payment/reversal pair, not a duplicate.
  const isDirectionMismatch = Math.sign(tx1.amount) !== Math.sign(tx2.amount);
  const isAmountMismatch = Math.abs(tx1.amount - tx2.amount) > 0.001;

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Unknown Account';
  };

  const handleMerge = async () => {
    if (isDifferentAccount || !keepId || !deleteId) return;
    setLoading(true);
    try {
      const res = await mergeTransactions(keepId, deleteId);
      if (res.success) {
        const remaining = res.data?.remainingReasons ?? [];
        if (remaining.length > 0) {
          toast.success(
              `Transactions merged. The kept transaction still needs review: ${remaining.map(reviewReasonLabel).join(', ')}`
          );
        } else {
          toast.success('Transactions merged and resolved');
        }
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('An error occurred while merging transactions');
    } finally {
      setLoading(false);
    }
  };

  const renderTxnCard = (tx: Transaction, isKept: boolean) => {
    const accountName = getAccountName(tx.accountId);
    const desc = tx.description || tx.sourcedDescription;

    return (
        <Card
            onClick={() => setKeepId(tx.id)}
            className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3',
                isKept
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 opacity-90'
            )}
        >
          {/* Action Header Badge */}
          <div className="flex items-center justify-between">
            <Badge
                className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md',
                    isKept
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                )}
            >
              {isKept ? 'Keep Transaction' : 'Delete (Merge In)'}
            </Badge>
            <span
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {getSourceLabel(tx.source)}
          </span>
          </div>

          {/* Txn Details */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {formatDate(tx.date)}
            </span>
              <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(tx.amount)}
            </span>
            </div>

            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
              {desc}
            </p>
            {tx.sourcedDescription && tx.description && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  Raw: {tx.sourcedDescription}
                </p>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              Account: <span className="font-medium text-slate-700 dark:text-slate-300">{accountName}</span>
            </div>
          </div>

          {/* Categories & Reasons Badges */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {tx.categories && tx.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tx.categories.map((c) => (
                      <span
                          key={c.id}
                          className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md"
                      >
                  {c.name}
                </span>
                  ))}
                </div>
            ) : (
                <span className="text-[10px] text-slate-400 italic">No categories</span>
            )}

            {tx.reviewReasons && tx.reviewReasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tx.reviewReasons.map((r) => (
                      <span
                          key={r}
                          className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium px-1.5 py-0.5 rounded-md"
                      >
                  {REVIEW_REASON_META[r]?.shortLabel || r}
                </span>
                  ))}
                </div>
            )}
          </div>
        </Card>
    );
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            className="sm:max-w-[700px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Merge Transactions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review the side-by-side details below. Choose which transaction to <strong>Keep</strong>.
              Missing fields from the deleted transaction will be merged onto the kept transaction, and review reasons
              will be cleared.
            </DialogDescription>
          </DialogHeader>

          {/* Warning Banners */}
          {isDifferentAccount ? (
              <div
                  className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"/>
                <span>
              <strong>Cross-Account Merge Blocked:</strong> These transactions belong to different accounts ({getAccountName(tx1.accountId)} vs {getAccountName(tx2.accountId)}). Cross-account merging is not allowed.
            </span>
              </div>
          ) : isDirectionMismatch ? (
              <div
                  className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"/>
                <span>
              <strong>Direction Mismatch:</strong> One transaction is a debit and the other a credit. These are usually a payment and its reversal, not duplicates — consider linking them instead of merging.
            </span>
              </div>
          ) : isAmountMismatch ? (
              <div
                  className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"/>
                <span>
              <strong>Amount Mismatch:</strong> Amounts differ between these transactions. Please confirm they represent the same real-world event before merging.
            </span>
              </div>
          ) : null}

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {renderTxnCard(tx1, keepId === tx1.id)}
            {renderTxnCard(tx2, keepId === tx2.id)}
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Click on a card above to flip the keep/delete selection.
          </p>
          <DialogFooter>
            <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
                size="sm"
                disabled={isDifferentAccount || loading}
                onClick={handleMerge}
                variant="primary"
            >
              {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                    <span>Merging...</span>
                  </>
              ) : (
                  <>
                    <Check className="h-3.5 w-3.5"/>
                    <span>Merge and resolve</span>
                  </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
