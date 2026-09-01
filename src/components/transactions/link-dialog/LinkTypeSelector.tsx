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
import { LinkType } from '@/lib/transaction.types';

interface LinkTypeSelectorProps {
  linkType: LinkType;
  setLinkType: (type: LinkType) => void;
  note: string;
  setNote: (note: string) => void;
  alignRefundCategories: boolean;
  setAlignRefundCategories: (align: boolean) => void;
}

export function LinkTypeSelector({
  linkType,
  setLinkType,
  note,
  setNote,
  alignRefundCategories,
  setAlignRefundCategories,
}: LinkTypeSelectorProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Link Type
          </Label>
          <Select
            value={linkType}
            onValueChange={(v) => setLinkType(v as LinkType)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRANSFER">Transfer (Bank / Wallet)</SelectItem>
              <SelectItem value="CC_PAYMENT">Credit Card Bill Payment</SelectItem>
              <SelectItem value="REFUND">Refund / Partial Refund</SelectItem>
              <SelectItem value="REVERSAL">Reversal</SelectItem>
              <SelectItem value="FEE">Fee / Surcharge</SelectItem>
              <SelectItem value="EMI">EMI / Installment</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
      </div>

      {/* Refund category alignment checkbox */}
      {linkType === 'REFUND' && (
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
