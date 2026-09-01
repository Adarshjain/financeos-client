'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Account, isAccountClosed } from '@/lib/account.types';
import type { LoanType, RateType } from '@/lib/types';

export const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'two_wheeler', label: 'Two Wheeler Loan' },
  { value: 'consumer_durable', label: 'Consumer Durable Loan' },
  { value: 'other', label: 'Other Loan' },
];

interface LoanBasicFieldsProps {
  name: string;
  setName: (n: string) => void;
  lender: string;
  setLender: (l: string) => void;
  loanType: LoanType;
  setLoanType: (t: LoanType) => void;
  rateType: RateType;
  setRateType: (r: RateType) => void;
  loanAccountNumber: string;
  setLoanAccountNumber: (a: string) => void;
  paymentAccountId: string;
  setPaymentAccountId: (id: string) => void;
  bankAccounts: Account[];
  coreDisabled: boolean;
}

export function LoanBasicFields({
  name,
  setName,
  lender,
  setLender,
  loanType,
  setLoanType,
  rateType,
  setRateType,
  loanAccountNumber,
  setLoanAccountNumber,
  paymentAccountId,
  setPaymentAccountId,
  bankAccounts,
  coreDisabled,
}: LoanBasicFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">
            Loan Name *
          </Label>
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
          <Label htmlFor="lender" className="text-xs">
            Lender *
          </Label>
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
          <Label htmlFor="loanType" className="text-xs">
            Loan Type *
          </Label>
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
          <Label htmlFor="rateType" className="text-xs">
            Rate Type *
          </Label>
          <Select
            value={rateType}
            onValueChange={(v) => setRateType(v as RateType)}
            disabled={coreDisabled}
          >
            <SelectTrigger id="rateType" className="h-9 text-xs">
              <SelectValue placeholder="Select rate type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed" className="text-xs">
                Fixed Rate
              </SelectItem>
              <SelectItem value="floating" className="text-xs">
                Floating Rate
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="loanAccountNumber" className="text-xs">
            Loan Account Number
          </Label>
          <Input
            id="loanAccountNumber"
            placeholder="e.g. 123456789"
            value={loanAccountNumber}
            onChange={(e) => setLoanAccountNumber(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="paymentAccount" className="text-xs">
            Payment Bank Account
          </Label>
          <Select
            value={paymentAccountId}
            onValueChange={(v) => setPaymentAccountId(v)}
          >
            <SelectTrigger id="paymentAccount" className="h-9 text-xs">
              <SelectValue placeholder="Select bank account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                -- None --
              </SelectItem>
              {bankAccounts
                .filter(
                  (acc) =>
                    !isAccountClosed(acc) || acc.id === paymentAccountId
                )
                .map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    {acc.name} {acc.closedOn ? '(Closed)' : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
