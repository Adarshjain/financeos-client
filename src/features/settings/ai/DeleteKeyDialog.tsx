'use client';

import React from 'react';

import { Dialog, DialogBody, DialogContent, Text } from '@/components/ds';
import type { LlmKeyDto } from '@/lib/api/types';

interface DeleteKeyDialogProps {
  keyToDelete: LlmKeyDto | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirms deleting an API key. */
export function DeleteKeyDialog({ keyToDelete, deleting, onCancel, onConfirm }: DeleteKeyDialogProps) {
  return (
    <Dialog open={keyToDelete !== null} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <DialogContent
        size="sm"
        dismissible={!deleting}
        title="Delete API key?"
        secondary={{ label: 'Cancel', disabled: deleting, onSelect: onCancel }}
        primary={{ label: 'Delete key', destructive: true, loading: deleting, disabled: deleting, onSelect: onConfirm }}
      >
        <DialogBody>
          <Text variant="body" tone="ink-2" as="p">
            Are you sure you want to delete {keyToDelete?.label || `${keyToDelete?.provider} key`} (•••• {keyToDelete?.keyLast4})?
          </Text>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
