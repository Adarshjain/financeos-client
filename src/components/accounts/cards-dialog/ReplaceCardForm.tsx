'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, Cardholder } from '@/lib/account.types';

interface ReplaceCardFormProps {
  targetCard: Card;
  targetCardholder: Cardholder | null;
  replaceNewLast4: string;
  setReplaceNewLast4: (val: string) => void;
  replaceIssuedOn: string;
  setReplaceIssuedOn: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ReplaceCardForm({
  targetCard,
  targetCardholder,
  replaceNewLast4,
  setReplaceNewLast4,
  replaceIssuedOn,
  setReplaceIssuedOn,
  formError,
  isSubmitting,
  onSubmit,
  onCancel,
}: ReplaceCardFormProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-sky-900 dark:text-sky-200">
          Replace Card •••• {targetCard.last4} ({targetCardholder?.personName || targetCardholder?.role})
        </span>
      </div>
      <p className="text-2xs text-slate-600 dark:text-slate-400">
        Replaces this physical plastic card. Reward rules, caps, and transaction history remain attached to {targetCardholder?.personName || targetCardholder?.role}.
      </p>
      {formError && (
        <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
          {formError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="rep-last4" className="text-xs">
            New Last 4 Digits <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="rep-last4"
            maxLength={4}
            placeholder="5678"
            value={replaceNewLast4}
            onChange={(e) => setReplaceNewLast4(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rep-issued" className="text-xs">
            New Card Issued Date <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="rep-issued"
            type="date"
            value={replaceIssuedOn}
            onChange={(e) => setReplaceIssuedOn(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Replacing...' : 'Confirm Replacement'}
        </Button>
      </div>
    </form>
  );
}
