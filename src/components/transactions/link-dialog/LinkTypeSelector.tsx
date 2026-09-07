'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isRecordKind, LinkKind, RECORD_LINK_KINDS } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

const RECORD_KIND_LABELS: Record<(typeof RECORD_LINK_KINDS)[number], string> = {
  LENDING: 'Lending (person ledger)',
  LOAN_PAYMENT: 'Loan EMI payment',
};

interface LinkTypeSelectorProps {
  kind: LinkKind;
  setKind: (kind: LinkKind) => void;
  note: string;
  setNote: (note: string) => void;
  alignRefundCategories: boolean;
  setAlignRefundCategories: (align: boolean) => void;
  disabledKinds: Partial<Record<LinkKind, string>>;
}

export function LinkTypeSelector({
  kind,
  setKind,
  note,
  setNote,
  alignRefundCategories,
  setAlignRefundCategories,
  disabledKinds,
}: LinkTypeSelectorProps) {
  const isRecord = isRecordKind(kind);
  const disabledRecordReasons = RECORD_LINK_KINDS.filter((k) => disabledKinds[k]);

  return (
    <>
      <div className={cn('grid grid-cols-1 gap-4', !isRecord && 'sm:grid-cols-2')}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Link Type
          </Label>
          <Select value={kind} onValueChange={(v) => setKind(v as LinkKind)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="__label_transactions"
                disabled
                className="text-2xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500"
              >
                Between transactions
              </SelectItem>
              <SelectItem value="TRANSFER">Transfer (Bank / Wallet)</SelectItem>
              <SelectItem value="CC_PAYMENT">Credit Card Bill Payment</SelectItem>
              <SelectItem value="REFUND">Refund / Partial Refund</SelectItem>
              <SelectItem value="REVERSAL">Reversal</SelectItem>
              <SelectItem value="FEE">Fee / Surcharge</SelectItem>
              <SelectItem value="EMI">EMI / Installment</SelectItem>
              <SelectItem
                value="__label_records"
                disabled
                className="text-2xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500"
              >
                Records
              </SelectItem>
              <SelectItem value="LENDING" disabled={Boolean(disabledKinds.LENDING)}>
                {RECORD_KIND_LABELS.LENDING}
              </SelectItem>
              <SelectItem value="LOAN_PAYMENT" disabled={Boolean(disabledKinds.LOAN_PAYMENT)}>
                {RECORD_KIND_LABELS.LOAN_PAYMENT}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isRecord && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Note (Optional)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly CC bill settlement"
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>

      {disabledRecordReasons.length > 0 && (
        <div className="space-y-0.5 px-1">
          {disabledRecordReasons.map((k) => (
            <p key={k} className="text-2xs text-slate-500 dark:text-slate-400">
              {RECORD_KIND_LABELS[k]}: {disabledKinds[k]}
            </p>
          ))}
        </div>
      )}

      {/* Refund category alignment checkbox */}
      {kind === 'REFUND' && (
        <div className="flex items-center space-x-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <Checkbox
            id="align-refund"
            checked={alignRefundCategories}
            onCheckedChange={(checked) => setAlignRefundCategories(!!checked)}
          />
          <label
            htmlFor="align-refund"
            className="text-xs font-medium text-indigo-900 dark:text-indigo-200 cursor-pointer"
          >
            Align refund category to original purchase
          </label>
        </div>
      )}
    </>
  );
}
