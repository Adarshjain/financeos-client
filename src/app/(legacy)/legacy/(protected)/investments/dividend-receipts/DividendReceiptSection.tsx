'use client';

import { toast } from 'sonner';

import { TransactionPicker } from '@/components/transactions/TransactionPicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ReceiptNote } from '@/features/investments/dividends/dividendsModel';
import { useDividendReceiptMutations } from '@/features/investments/dividends/useDividendReceiptMutations';
import { toastError } from '@/lib/toastError';
import type { Dividend } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

import { ReceiptStatusBadge } from './ReceiptStatusBadge';

/** A TDS hint is only offered when the shortfall looks like withholding. */
const MAX_TDS_GAP_FRACTION = 0.25;

const DERIVED = 'derived';

interface DividendReceiptSectionProps {
  dividend: Dividend;
  /** Current values of the edit form's amount / TDS fields. */
  amount: string;
  tds: string;
  onUseTds: (value: string) => void;
  onSuccess?: () => void;
}

export function DividendReceiptSection({ dividend, amount, tds, onUseTds, onSuccess }: DividendReceiptSectionProps) {
  const txn = dividend.transaction ?? null;
  const receipt = useDividendReceiptMutations();
  const busy = receipt.busy;

  const afterChange = async () => {
    await receipt.refresh();
    onSuccess?.();
  };

  const handleLink = async (transactionId: string) => {
    try {
      await receipt.link.mutateAsync({ id: dividend.id, transactionId });
      toast.success('Linked');
      await afterChange();
    } catch (err) {
      toastError(err, 'Failed to link transaction');
    }
  };

  const handleUnlink = async () => {
    try {
      await receipt.unlink.mutateAsync(dividend.id);
      toast.success('Unlinked');
      await afterChange();
    } catch (err) {
      toastError(err, 'Failed to unlink transaction');
    }
  };

  const handleStatus = async (value: string) => {
    try {
      await receipt.setNote.mutateAsync({ id: dividend.id, note: value as ReceiptNote });
      toast.success('Receipt note updated');
      await afterChange();
    } catch (err) {
      toastError(err, 'Failed to update receipt note');
    }
  };

  const grossAmount = Number(amount) || 0;
  const gap = txn ? grossAmount - txn.signedAmount : 0;
  const showTdsHint = !!txn && tds.trim() === '' && gap > 0 && gap <= grossAmount * MAX_TDS_GAP_FRACTION;
  const expectedNet = Number(dividend.amount || 0) - Number(dividend.tds || 0);
  const noteValue =
    dividend.receiptStatus === 'received_untracked' || dividend.receiptStatus === 'not_received'
      ? dividend.receiptStatus
      : DERIVED;

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Receipt</Label>
        <ReceiptStatusBadge status={dividend.receiptStatus} />
      </div>

      <TransactionPicker
        value={
          txn
            ? {
                id: txn.id,
                description: txn.description,
                date: txn.date,
                accountId: txn.accountId ?? '',
                accountName: txn.accountName,
                signedAmount: txn.signedAmount,
              }
            : null
        }
        onSelect={(t) => handleLink(t.id)}
        onClear={handleUnlink}
        type="CREDIT"
        shareableKind="DIVIDEND"
        suggestAmount={expectedNet}
        suggestDate={dividend.payDate}
        ruleHint="Dividends link money-in (credit) transactions."
        disabled={busy}
      />

      {showTdsHint && (
        <div className="flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400">
          <span>The credit is {formatMoney(gap)} short of the gross amount.</span>
          <Button
            type="button"
            variant="ghost"
            size="micro"
            onClick={() => onUseTds(String(Math.round(gap * 100) / 100))}
          >
            Use {formatMoney(gap)} as TDS
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Receipt note</Label>
        <Select value={noteValue} onValueChange={handleStatus} disabled={busy || !!txn}>
          <SelectTrigger aria-label="Receipt note" className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <SelectItem value={DERIVED} className="text-xs">
              Derived automatically
            </SelectItem>
            <SelectItem value="received_untracked" className="text-xs">
              Received in an untracked account
            </SelectItem>
            <SelectItem value="not_received" className="text-xs">
              Not received (chasing)
            </SelectItem>
          </SelectContent>
        </Select>
        {txn && <p className="text-2xs text-slate-400 dark:text-slate-500">Unlink to change</p>}
      </div>
    </div>
  );
}
