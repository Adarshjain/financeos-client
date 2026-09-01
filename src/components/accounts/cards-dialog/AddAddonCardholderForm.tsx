'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardholderRelationship } from '@/lib/account.types';

import { RELATIONSHIP_LABELS } from './constants';

interface AddAddonCardholderFormProps {
  personName: string;
  setPersonName: (val: string) => void;
  relationship: CardholderRelationship;
  setRelationship: (val: CardholderRelationship) => void;
  spendLimit: string;
  setSpendLimit: (val: string) => void;
  openedOn: string;
  setOpenedOn: (val: string) => void;
  cardLast4: string;
  setCardLast4: (val: string) => void;
  issuedOn: string;
  setIssuedOn: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  isBank?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function AddAddonCardholderForm({
  personName,
  setPersonName,
  relationship,
  setRelationship,
  spendLimit,
  setSpendLimit,
  openedOn,
  setOpenedOn,
  cardLast4,
  setCardLast4,
  issuedOn,
  setIssuedOn,
  formError,
  isSubmitting,
  isBank,
  onSubmit,
  onCancel,
}: AddAddonCardholderFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
      {formError && (
        <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="ch-name" className="text-xs">
            Cardholder Person Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="ch-name"
            placeholder="e.g. Jane Doe"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ch-rel" className="text-xs">
            Relationship <span className="text-rose-500">*</span>
          </Label>
          <Select value={relationship} onValueChange={(v) => setRelationship(v as CardholderRelationship)}>
            <SelectTrigger id="ch-rel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RELATIONSHIP_LABELS)
                .filter(([k]) => k !== 'SELF')
                .map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ch-limit" className="text-xs">
            Monthly Spend Limit (₹, optional)
          </Label>
          <Input
            id="ch-limit"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 50000"
            value={spendLimit}
            onChange={(e) => setSpendLimit(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ch-opened" className="text-xs">
            Opened On Date
          </Label>
          <Input
            id="ch-opened"
            type="date"
            value={openedOn}
            onChange={(e) => setOpenedOn(e.target.value)}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Initial Plastic Card (Optional)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ch-card-last4" className="text-xs">
              Last 4 Digits
            </Label>
            <Input
              id="ch-card-last4"
              maxLength={4}
              placeholder="e.g. 5678"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ch-card-issued" className="text-xs">
              Issued On Date
            </Label>
            <Input
              id="ch-card-issued"
              type="date"
              value={issuedOn}
              onChange={(e) => setIssuedOn(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Saving...
            </>
          ) : isBank ? (
            'Add joint holder'
          ) : (
            'Create Add-on Cardholder'
          )}
        </Button>
      </div>
    </form>
  );
}
