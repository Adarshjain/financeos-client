'use client';

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
import { Cardholder } from '@/lib/account.types';

interface ReassignTransactionsFormProps {
  targetCardholder: Cardholder;
  cardholders: Cardholder[];
  reattributeSource: string;
  setReattributeSource: (val: string) => void;
  reattributeFrom: string;
  setReattributeFrom: (val: string) => void;
  reattributeTo: string;
  setReattributeTo: (val: string) => void;
  reattributeError: string | null;
  isReattributing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ReassignTransactionsForm({
  targetCardholder,
  cardholders,
  reattributeSource,
  setReattributeSource,
  reattributeFrom,
  setReattributeFrom,
  reattributeTo,
  setReattributeTo,
  reattributeError,
  isReattributing,
  onSubmit,
  onCancel,
}: ReassignTransactionsFormProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          Reassign Transactions to {targetCardholder.personName || targetCardholder.role}
        </span>
      </div>
      <p className="text-2xs text-slate-500 dark:text-slate-400">
        Move transactions from statement-sourced unattributed rows or another cardholder to this cardholder.
      </p>
      {reattributeError && (
        <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
          {reattributeError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="reassign-source" className="text-xs">
            Source
          </Label>
          <Select value={reattributeSource} onValueChange={setReattributeSource}>
            <SelectTrigger id="reassign-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNATTRIBUTED">Unattributed Transactions</SelectItem>
              {cardholders
                .filter((ch) => ch.id !== targetCardholder.id)
                .flatMap((ch) =>
                  (ch.cards || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      •••• {c.last4} ({ch.personName || ch.role})
                    </SelectItem>
                  ))
                )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="reassign-from" className="text-xs">
            From Date (optional)
          </Label>
          <Input
            id="reassign-from"
            type="date"
            value={reattributeFrom}
            onChange={(e) => setReattributeFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reassign-to" className="text-xs">
            To Date (optional)
          </Label>
          <Input
            id="reassign-to"
            type="date"
            value={reattributeTo}
            onChange={(e) => setReattributeTo(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isReattributing}>
          {isReattributing ? 'Reassigning...' : 'Reassign Transactions'}
        </Button>
      </div>
    </form>
  );
}
