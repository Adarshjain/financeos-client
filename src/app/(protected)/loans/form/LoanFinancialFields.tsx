'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LoanFinancialFieldsProps {
  principal: string;
  setPrincipal: (p: string) => void;
  annualRatePct: string;
  setAnnualRatePct: (r: string) => void;
  tenureMonths: string;
  setTenureMonths: (t: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  firstEmiDate: string;
  setFirstEmiDate: (d: string) => void;
  emiAmount: string;
  setEmiAmount: (e: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  coreDisabled: boolean;
}

export function LoanFinancialFields({
  principal,
  setPrincipal,
  annualRatePct,
  setAnnualRatePct,
  tenureMonths,
  setTenureMonths,
  startDate,
  setStartDate,
  firstEmiDate,
  setFirstEmiDate,
  emiAmount,
  setEmiAmount,
  notes,
  setNotes,
  coreDisabled,
}: LoanFinancialFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="principal" className="text-xs">
            Principal (₹) *
          </Label>
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
          <Label htmlFor="annualRatePct" className="text-xs">
            Annual Rate (%) *
          </Label>
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
          <Label htmlFor="tenureMonths" className="text-xs">
            Tenure (Months) *
          </Label>
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
          <Label htmlFor="startDate" className="text-xs">
            Disbursal Date *
          </Label>
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
          <Label htmlFor="firstEmiDate" className="text-xs">
            First EMI Due *
          </Label>
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
          <Label htmlFor="emiAmount" className="text-xs">
            EMI Amount (₹)
          </Label>
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
        <Label htmlFor="notes" className="text-xs">
          Notes
        </Label>
        <Textarea
          id="notes"
          rows={2}
          placeholder="Optional notes or details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-xs"
        />
      </div>
    </>
  );
}
