'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { createLoanAction, updateLoanAction } from '@/actions/loans';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Account } from '@/lib/account.types';
import type { LoanResponse, LoanType, RateType } from '@/lib/types';

interface LoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: Account[];
  loanToEdit?: LoanResponse;
  hasEventsOrPayments?: boolean;
  onSuccess?: () => void;
}

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'two_wheeler', label: 'Two Wheeler Loan' },
  { value: 'consumer_durable', label: 'Consumer Durable Loan' },
  { value: 'other', label: 'Other Loan' },
];

export function LoanForm({
  open,
  onOpenChange,
  bankAccounts,
  loanToEdit,
  hasEventsOrPayments = false,
  onSuccess,
}: LoanFormProps) {
  const isEdit = Boolean(loanToEdit);

  const [name, setName] = useState(loanToEdit?.name ?? '');
  const [lender, setLender] = useState(loanToEdit?.lender ?? '');
  const [loanType, setLoanType] = useState<LoanType>(loanToEdit?.loanType ?? 'home');
  const [rateType, setRateType] = useState<RateType>(loanToEdit?.rateType ?? 'fixed');
  const [loanAccountNumber, setLoanAccountNumber] = useState(
    loanToEdit?.loanAccountNumber ?? '',
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    loanToEdit?.paymentAccountId ?? '',
  );
  const [principal, setPrincipal] = useState(
    loanToEdit?.principal ? String(loanToEdit.principal) : '',
  );
  const [annualRatePct, setAnnualRatePct] = useState(
    loanToEdit?.annualRatePct ? String(loanToEdit.annualRatePct) : '',
  );
  const [tenureMonths, setTenureMonths] = useState(
    loanToEdit?.tenureMonths ? String(loanToEdit.tenureMonths) : '',
  );
  const [startDate, setStartDate] = useState(
    loanToEdit?.startDate ?? new Date().toISOString().split('T')[0],
  );
  const [firstEmiDate, setFirstEmiDate] = useState(
    loanToEdit?.firstEmiDate ?? new Date().toISOString().split('T')[0],
  );
  const [emiAmount, setEmiAmount] = useState(
    loanToEdit?.emiAmount ? String(loanToEdit.emiAmount) : '',
  );
  const [notes, setNotes] = useState(loanToEdit?.notes ?? '');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Loan name is required');
      return;
    }
    if (!lender.trim()) {
      toast.error('Lender is required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && loanToEdit) {
        const res = await updateLoanAction(loanToEdit.id, {
          name: name.trim(),
          lender: lender.trim(),
          loanType,
          rateType,
          loanAccountNumber: loanAccountNumber.trim() || undefined,
          paymentAccountId: paymentAccountId || undefined,
          principal: principal ? Number(principal) : undefined,
          annualRatePct: annualRatePct ? Number(annualRatePct) : undefined,
          tenureMonths: tenureMonths ? Number(tenureMonths) : undefined,
          startDate,
          firstEmiDate,
          emiAmount: emiAmount ? Number(emiAmount) : undefined,
          notes: notes.trim() || undefined,
        });

        if (res.success) {
          toast.success('Loan updated successfully');
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      } else {
        if (!principal || Number(principal) <= 0) {
          toast.error('Principal must be greater than zero');
          setLoading(false);
          return;
        }
        if (!annualRatePct || Number(annualRatePct) <= 0) {
          toast.error('Annual rate % must be greater than zero');
          setLoading(false);
          return;
        }
        if (!tenureMonths || Number(tenureMonths) < 1) {
          toast.error('Tenure must be at least 1 month');
          setLoading(false);
          return;
        }

        const res = await createLoanAction({
          name: name.trim(),
          lender: lender.trim(),
          loanType,
          rateType,
          loanAccountNumber: loanAccountNumber.trim() || undefined,
          paymentAccountId: paymentAccountId || undefined,
          principal: Number(principal),
          annualRatePct: Number(annualRatePct),
          tenureMonths: Number(tenureMonths),
          startDate,
          firstEmiDate,
          emiAmount: emiAmount ? Number(emiAmount) : undefined,
          notes: notes.trim() || undefined,
        });

        if (res.success) {
          toast.success('Loan created successfully');
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const coreDisabled = isEdit && hasEventsOrPayments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? 'Edit Loan' : 'Create New Loan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-1">
          {coreDisabled && (
            <div className="p-2.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg">
              Core terms (principal, rate, tenure, dates, EMI) are locked because events or payments exist.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Loan Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Home Loan HDFC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lender" className="text-xs">Lender *</Label>
              <Input
                id="lender"
                placeholder="e.g. HDFC Bank"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="loanType" className="text-xs">Loan Type *</Label>
              <Select
                value={loanType}
                onValueChange={(v) => setLoanType(v as LoanType)}
              >
                <SelectTrigger id="loanType" className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rateType" className="text-xs">Rate Type *</Label>
              <Select
                value={rateType}
                onValueChange={(v) => setRateType(v as RateType)}
                disabled={coreDisabled}
              >
                <SelectTrigger id="rateType" className="h-9 text-xs">
                  <SelectValue placeholder="Select rate type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed" className="text-xs">Fixed Rate</SelectItem>
                  <SelectItem value="floating" className="text-xs">Floating Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="loanAccountNumber" className="text-xs">Loan Account Number</Label>
              <Input
                id="loanAccountNumber"
                placeholder="e.g. 123456789"
                value={loanAccountNumber}
                onChange={(e) => setLoanAccountNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="paymentAccount" className="text-xs">Payment Bank Account</Label>
              <Select
                value={paymentAccountId}
                onValueChange={(v) => setPaymentAccountId(v)}
              >
                <SelectTrigger id="paymentAccount" className="h-9 text-xs">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">-- None --</SelectItem>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="principal" className="text-xs">Principal (₹) *</Label>
              <Input
                id="principal"
                type="number"
                step="0.01"
                placeholder="1000000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                disabled={coreDisabled}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="annualRatePct" className="text-xs">Annual Rate (%) *</Label>
              <Input
                id="annualRatePct"
                type="number"
                step="0.01"
                placeholder="8.5"
                value={annualRatePct}
                onChange={(e) => setAnnualRatePct(e.target.value)}
                disabled={coreDisabled}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tenureMonths" className="text-xs">Tenure (Months) *</Label>
              <Input
                id="tenureMonths"
                type="number"
                placeholder="240"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                disabled={coreDisabled}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startDate" className="text-xs">Disbursal Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={coreDisabled}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="firstEmiDate" className="text-xs">First EMI Due *</Label>
              <Input
                id="firstEmiDate"
                type="date"
                value={firstEmiDate}
                onChange={(e) => setFirstEmiDate(e.target.value)}
                disabled={coreDisabled}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="emiAmount" className="text-xs">EMI Amount (₹)</Label>
              <Input
                id="emiAmount"
                type="number"
                step="0.01"
                placeholder="Auto if blank"
                value={emiAmount}
                onChange={(e) => setEmiAmount(e.target.value)}
                disabled={coreDisabled}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Optional notes or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Loan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
