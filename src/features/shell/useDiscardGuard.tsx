'use client';

import React from 'react';

import { ConfirmDialog } from '@/components/ds';

/**
 * Closing a form dialog with unsaved changes asks "Discard changes?" first. `requestClose` goes on Cancel, ×, the
 * backdrop and Esc; `node` (the confirm) sits beside the dialog. It closes at once when nothing changed and ignores
 * requests while `busy`. `what` names the thing in the question ("loan"); closing after a save calls `onClose` directly.
 */
export function useDiscardGuard({
  dirty,
  onClose,
  busy = false,
  what,
}: {
  dirty: boolean;
  onClose: () => void;
  busy?: boolean;
  what?: string;
}) {
  const [asking, setAsking] = React.useState(false);
  const requestClose = () => {
    if (busy) return;
    if (dirty) setAsking(true);
    else onClose();
  };
  const node = asking ? (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) setAsking(false);
      }}
      tone="default"
      title="Discard changes?"
      description={`This ${what ?? 'form'} has changes that are not saved.`}
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      onConfirm={() => {
        setAsking(false);
        onClose();
      }}
    />
  ) : null;
  return { requestClose, node };
}
