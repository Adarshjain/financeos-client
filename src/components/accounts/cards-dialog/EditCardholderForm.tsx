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
import { Cardholder, CardholderRelationship } from '@/lib/account.types';

import { RELATIONSHIP_LABELS } from './constants';

interface EditCardholderFormProps {
  targetCardholder: Cardholder;
  personName: string;
  setPersonName: (val: string) => void;
  relationship: CardholderRelationship;
  setRelationship: (val: CardholderRelationship) => void;
  spendLimit: string;
  setSpendLimit: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function EditCardholderForm({
  targetCardholder,
  personName,
  setPersonName,
  relationship,
  setRelationship,
  spendLimit,
  setSpendLimit,
  formError,
  isSubmitting,
  onSubmit,
  onCancel,
}: EditCardholderFormProps) {
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
          <Label htmlFor="edit-ch-name" className="text-xs">
            Cardholder Person Name
          </Label>
          <Input
            id="edit-ch-name"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-ch-rel" className="text-xs">
            Relationship
          </Label>
          <Select
            value={relationship}
            onValueChange={(v) => setRelationship(v as CardholderRelationship)}
            disabled={targetCardholder.role === 'PRIMARY'}
          >
            <SelectTrigger id="edit-ch-rel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targetCardholder.role === 'PRIMARY' ? (
                <SelectItem value="SELF">Self (Primary)</SelectItem>
              ) : (
                Object.entries(RELATIONSHIP_LABELS)
                  .filter(([k]) => k !== 'SELF')
                  .map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-ch-limit" className="text-xs">
            Monthly Spend Limit (₹)
          </Label>
          <Input
            id="edit-ch-limit"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 50000"
            value={spendLimit}
            onChange={(e) => setSpendLimit(e.target.value)}
          />
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
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
