'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cardholder } from '@/lib/account.types';

interface CloseCardholderFormProps {
  targetCardholder: Cardholder;
  closeDate: string;
  setCloseDate: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  onConfirmClose: () => void;
}

export function CloseCardholderForm({
  targetCardholder,
  closeDate,
  setCloseDate,
  formError,
  isSubmitting,
  onConfirmClose,
}: CloseCardholderFormProps) {
  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          Close Cardholder Line ({targetCardholder.personName || targetCardholder.role})
        </span>
      </div>
      <p className="text-2xs text-amber-800/80 dark:text-amber-300/80">
        Closing this cardholder line will retire its plastic cards. Past transactions, caps, and milestones remain preserved.
      </p>
      {formError && (
        <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
          {formError}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="space-y-1 flex-1">
          <Label htmlFor="ch-close-date" className="text-xs">
            Closed On Date
          </Label>
          <Input
            id="ch-close-date"
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="mt-5 bg-rose-600 hover:bg-rose-700 text-white"
          disabled={isSubmitting}
          onClick={onConfirmClose}
        >
          {isSubmitting ? 'Closing...' : 'Confirm Close Line'}
        </Button>
      </div>
    </div>
  );
}
