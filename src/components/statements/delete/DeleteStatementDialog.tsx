'use client';

import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deletionImpactItems, deletionNote } from '@/features/accounts/statements/deletionImpactModel';
import { type StatementDeletionPreview, useDeleteStatement } from '@/features/accounts/statements/useDeleteStatement';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { StatementSource } from '@/lib/statement.types';
import { toastError } from '@/lib/toastError';

interface DeleteStatementDialogProps {
  accountId: string;
  statementId: string;
  source: StatementSource;
  /** Shown in the description, e.g. "23 Feb – 27 Feb 2026". */
  periodLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function DeleteStatementDialog({
  accountId,
  statementId,
  source,
  periodLabel,
  open,
  onOpenChange,
  onDeleted,
}: DeleteStatementDialogProps) {
  const { preview, remove, refreshAfterDelete } = useDeleteStatement(accountId, statementId, open);
  const busy = remove.isPending;

  const handleDelete = async () => {
    try {
      const result = await remove.mutateAsync();
      toast.success(`Statement deleted, ${count(result.transactionsDeleted, 'transaction', 'transactions')} removed`);
      onOpenChange(false);
      onDeleted();
      void refreshAfterDelete();
    } catch (error) {
      toastError(error, 'Failed to delete statement');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            Delete statement
          </DialogTitle>
          <DialogDescription className="text-xs">
            Removes the {periodLabel} statement and what it added to this account.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="text-xs text-slate-600 dark:text-slate-300">
          {preview.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking what this statement added...</span>
            </div>
          ) : preview.error ? (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{getErrorMessage(preview.error, 'Could not check this statement')}</span>
            </div>
          ) : preview.data ? (
            <DeletionSummary preview={preview.data} source={source} />
          ) : null}
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: 'Delete statement',
            variant: 'destructive',
            onClick: handleDelete,
            pending: busy,
            disabled: !preview.data,
          }}
          secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false), disabled: busy }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeletionSummary({ preview, source }: { preview: StatementDeletionPreview; source: StatementSource }) {
  return (
    <div className="space-y-2.5">
      <ul className="list-disc pl-4 space-y-1.5">
        {deletionImpactItems(preview).map((item) => (
          <li key={item.lead ?? item.text}>
            {item.lead ? <strong>{item.lead}</strong> : null}
            {item.text}
          </li>
        ))}
      </ul>
      <p className="text-2xs text-slate-500 dark:text-slate-400">{deletionNote(source)}</p>
    </div>
  );
}
