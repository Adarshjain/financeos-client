'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextArea } from '@/components/ds/TextArea/TextArea';

import { MAX_REASON_LENGTH } from './failuresModel';

interface ReasonDialogProps {
  title: string;
  description: string;
  /** The confirming button: "Skip" or "Dismiss". */
  confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

/** Skip… / Dismiss…: a required reason (max 500) before the item leaves the failed list. */
export function ReasonDialog({ title, description, confirmLabel, onConfirm, onClose }: ReasonDialogProps) {
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const trimmed = reason.trim();

  const submit = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        dismissible={!busy}
        title={title}
        description={description}
        secondary={{ label: 'Cancel', disabled: busy, onSelect: onClose }}
        primary={{ label: confirmLabel, loading: busy, disabled: !trimmed, onSelect: () => void submit() }}
      >
        <Dialog.Body>
          <TextArea
            label="Reason"
            value={reason}
            maxLength={MAX_REASON_LENGTH}
            minRows={3}
            helper={`${reason.length} / ${MAX_REASON_LENGTH}`}
            onValueChange={setReason}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
