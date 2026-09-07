'use client';

import { TransactionPicker } from '@/components/transactions/TransactionPicker';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/lib/transaction.types';
import { InstallmentDto } from '@/lib/types';

interface SettlePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedInstallment: InstallmentDto | null;
  paymentDate: string;
  setPaymentDate: (d: string) => void;
  paymentAmount: string;
  setPaymentAmount: (a: string) => void;
  paymentTx: Transaction | null;
  onSelectPaymentTx: (t: Transaction) => void;
  onClearPaymentTx: () => void;
  submittingPayment: boolean;
  onSettlePayment: (e: React.FormEvent) => Promise<void>;
}

export function SettlePaymentDialog({
  open,
  onOpenChange,
  selectedInstallment,
  paymentDate,
  setPaymentDate,
  paymentAmount,
  setPaymentAmount,
  paymentTx,
  onSelectPaymentTx,
  onClearPaymentTx,
  submittingPayment,
  onSettlePayment,
}: SettlePaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Settle Installment #{selectedInstallment?.seq}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="settle-payment-form"
            onSubmit={onSettlePayment}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs">Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction (Optional)</Label>
              <TransactionPicker
                value={paymentTx}
                onSelect={onSelectPaymentTx}
                onClear={onClearPaymentTx}
                type="DEBIT"
                excludeAnyObligationRef
                suggestAmount={selectedInstallment?.emi ?? null}
                suggestDate={selectedInstallment?.dueDate ?? null}
                ruleHint="EMI settlements link money-out (debit) transactions"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: submittingPayment ? 'Saving...' : 'Confirm Settle',
            type: 'submit',
            form: 'settle-payment-form',
            disabled: submittingPayment,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
