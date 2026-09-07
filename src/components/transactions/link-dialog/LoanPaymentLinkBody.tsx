'use client';

import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InstallmentDto, LoanResponse } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface LoanPaymentLinkBodyProps {
  transaction: Transaction;
  loans: LoanResponse[];
  loadingLoans: boolean;
  loanId: string;
  setLoanId: (id: string) => void;
  installments: InstallmentDto[];
  loadingSchedule: boolean;
  installmentSeq: number | undefined;
  setInstallmentSeq: (seq: number) => void;
  paymentDate: string;
  setPaymentDate: (date: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
}

/** Body for the LOAN_PAYMENT link kind: pick a loan + unsettled installment, confirm date/amount. */
export function LoanPaymentLinkBody({
  transaction,
  loans,
  loadingLoans,
  loanId,
  setLoanId,
  installments,
  loadingSchedule,
  installmentSeq,
  setInstallmentSeq,
  paymentDate,
  setPaymentDate,
  amount,
  setAmount,
}: LoanPaymentLinkBodyProps) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-0.5">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
          {transaction.description ?? transaction.sourcedDescription}
        </div>
        <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
          <span>{formatDate(transaction.date)}</span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white">
            -{formatMoney(Math.abs(transaction.amount))}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="loanPaymentLoanSelect" className="text-xs">
          Loan *
        </Label>
        <Select value={loanId} onValueChange={setLoanId}>
          <SelectTrigger id="loanPaymentLoanSelect" className="h-9 text-xs">
            <SelectValue placeholder={loadingLoans ? 'Loading…' : 'Select loan'} />
          </SelectTrigger>
          <SelectContent>
            {loans.map((loan) => (
              <SelectItem key={loan.id} value={loan.id} className="text-xs">
                {loan.name}
                {loan.lender ? ` · ${loan.lender}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="loanPaymentInstallmentSelect" className="text-xs">
          Installment *
        </Label>
        {loadingSchedule ? (
          <div className="flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading schedule…
          </div>
        ) : (
          <Select
            value={installmentSeq !== undefined ? String(installmentSeq) : ''}
            onValueChange={(v) => setInstallmentSeq(Number(v))}
            disabled={!loanId || installments.length === 0}
          >
            <SelectTrigger id="loanPaymentInstallmentSelect" className="h-9 text-xs">
              <SelectValue
                placeholder={
                  !loanId
                    ? 'Pick a loan first'
                    : installments.length === 0
                      ? 'No unsettled installments'
                      : 'Select installment'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {installments.map((i) => (
                <SelectItem key={i.seq} value={String(i.seq)} className="text-xs">
                  #{i.seq} · due {formatDate(i.dueDate)} · EMI {formatMoney(i.emi)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="loanPaymentDate" className="text-xs">
            Payment Date *
          </Label>
          <Input
            id="loanPaymentDate"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="loanPaymentAmount" className="text-xs">
            Amount (₹) *
          </Label>
          <Input
            id="loanPaymentAmount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
