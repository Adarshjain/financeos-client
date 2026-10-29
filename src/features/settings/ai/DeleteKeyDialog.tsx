'use client';

import React from 'react';

import { Dialog, Text } from '@/components/ds';
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
      <Dialog.Content
        size="sm"
        dismissible={!deleting}
        title="Delete API key?"
        secondary={{ label: 'Cancel', disabled: deleting, onSelect: onCancel }}
        primary={{ label: 'Delete', tone: 'danger', loading: deleting, disabled: deleting, onSelect: onConfirm }}
      >
        <Dialog.Body>
          <Text variant="body" tone="ink-2" as="p">
            {keyToDelete?.label || `${keyToDelete?.provider} key`} (•••• {keyToDelete?.keyLast4}) goes. Your other keys stay. This can&apos;t be undone.
          </Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
