'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DangerZoneSectionProps {
  isSubmitting: boolean;
  isDeleting: boolean;
  onDeleteClick: () => void;
}

export function DangerZoneSection({
  isSubmitting,
  isDeleting,
  onDeleteClick,
}: DangerZoneSectionProps) {
  return (
    <div className="rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20 p-3.5 flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="text-xs font-bold text-rose-700 dark:text-rose-400">Delete Account</div>
        <div className="text-2xs text-rose-600/80 dark:text-rose-400/80">
          Permanently delete this account and its transactions.
        </div>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="xs"
        className="gap-1.5 shrink-0"
        disabled={isSubmitting || isDeleting}
        onClick={onDeleteClick}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </Button>
    </div>
  );
}
