'use client';

import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IssueCardFormProps {
  cardLast4: string;
  setCardLast4: (val: string) => void;
  issuedOn: string;
  setIssuedOn: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function IssueCardForm({
  cardLast4,
  setCardLast4,
  issuedOn,
  setIssuedOn,
  formError,
  isSubmitting,
  onSubmit,
  onCancel,
}: IssueCardFormProps) {
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
          <Label htmlFor="issue-last4" className="text-xs">
            Card Last 4 Digits <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="issue-last4"
            maxLength={4}
            placeholder="1234"
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="issue-date" className="text-xs">
            Issued On Date <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="issue-date"
            type="date"
            value={issuedOn}
            onChange={(e) => setIssuedOn(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Issuing...' : 'Issue Plastic'}
        </Button>
      </div>
    </form>
  );
}
