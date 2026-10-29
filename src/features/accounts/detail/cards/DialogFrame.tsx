'use client';

import React from 'react';

import { Banner, Dialog } from '@/components/ds';

import type { ActionResult } from './useCardholderMutations';

/** Runs a mutation from a dialog: closes on success, keeps the dialog open and shows the message on failure. */
export function useDialogSubmit(onClose: () => void) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const submit = async (work: () => ActionResult) => {
    setPending(true);
    setError(null);
    const message = await work();
    setPending(false);
    if (message) setError(message);
    else onClose();
  };
  return { pending, error, setError, submit };
}

/** A small form dialog: title, description, the fields, a failed-request banner, Cancel and the primary action. */
export function DialogFrame({
  title,
  description,
  submitLabel,
  onSubmit,
  onClose,
  pending,
  error,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  submitLabel: React.ReactNode;
  onSubmit: () => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title={title}
        description={description}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: pending }}
        primary={{ label: submitLabel, onSelect: onSubmit, loading: pending }}
      >
        <Dialog.Body>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          {children}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
