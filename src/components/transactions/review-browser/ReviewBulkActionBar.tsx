'use client';

import { Check, GitMerge, Trash2 } from 'lucide-react';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';

interface ReviewBulkActionBarProps {
  selectedCount: number;
  batchActionLoading: boolean;
  onOpenMerge: () => void;
  onOpenApprove: () => void;
  onBatchDelete: () => void;
}

export function ReviewBulkActionBar({
  selectedCount,
  batchActionLoading,
  onOpenMerge,
  onOpenApprove,
  onBatchDelete,
}: ReviewBulkActionBarProps) {
  return (
    <div className="w-full flex items-center justify-between lg:justify-start gap-1 text-slate-800 dark:text-slate-200 animate-in fade-in duration-200">
      <span className="text-xs font-semibold whitespace-nowrap pl-1">
        {selectedCount} selected
      </span>
      <div className="flex items-center">
        {selectedCount === 2 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={batchActionLoading}
            onClick={onOpenMerge}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-350 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-bold"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>Merge</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={batchActionLoading}
          onClick={onOpenApprove}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-350 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Approve</span>
        </Button>

        <ConfirmationDialog
          title="Delete Transactions?"
          description={`Are you sure you want to permanently delete these ${selectedCount} transaction${selectedCount === 1 ? '' : 's'}? This action is permanent and cannot be undone.`}
          primaryActionText={batchActionLoading ? 'Deleting...' : 'Delete'}
          primaryAction={onBatchDelete}
          loading={batchActionLoading}
          trigger={
            <Button
              variant="ghost-destructive"
              size="sm"
              disabled={batchActionLoading}
              className="font-bold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          }
        />
      </div>
    </div>
  );
}
