'use client';

import React from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LlmKeyDto } from '@/lib/llmKey.types';

interface DeleteKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyToDelete: LlmKeyDto | null;
  deleting: boolean;
  onDeleteKey: () => void;
}

export function DeleteKeyDialog({
  open,
  onOpenChange,
  keyToDelete,
  deleting,
  onDeleteKey,
}: DeleteKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Delete API Key?</DialogTitle>
        </DialogHeader>

        <DialogBody className="py-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete{' '}
            {keyToDelete?.label || `${keyToDelete?.provider} key`} (••••{' '}
            {keyToDelete?.keyLast4})?
          </p>
        </DialogBody>

        <DialogFooter
          secondaryAction={{
            label: 'Cancel',
            onClick: () => onOpenChange(false),
            disabled: deleting,
          }}
          primaryAction={{
            label: deleting ? 'Deleting...' : 'Delete Key',
            variant: 'destructive',
            onClick: onDeleteKey,
            disabled: deleting,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
