'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ConfirmDialog, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Instrument } from '@/lib/types';

import { describeOverriddenFields } from './instrumentEdit';
import { useResetInstrumentOverrides } from './useInstrumentEdit';

export interface ResetInstrumentDialogProps {
  instrument: Instrument;
  onClose: () => void;
}

/** Drops the user's own edits to an instrument (confirmed first): it shows the catalog details again, for this account only. */
export function ResetInstrumentDialog({ instrument, onClose }: ResetInstrumentDialogProps) {
  const router = useRouter();
  const reset = useResetInstrumentOverrides();
  const fields = describeOverriddenFields(instrument.overriddenFields);

  const confirm = async () => {
    try {
      const restored = await reset.mutateAsync(instrument.id);
      showToast(`${restored.name} reset to catalog`, { tone: 'success' });
      router.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't reset the instrument. Try again."), { tone: 'danger' });
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open && !reset.isPending) onClose();
      }}
      title="Reset to catalog?"
      description={`Your edits to ${instrument.name}${fields ? ` (${fields})` : ''} are removed and it shows the catalog details again. Only your account is affected.`}
      tone="default"
      confirmLabel="Reset to catalog"
      confirmLoading={reset.isPending}
      onConfirm={() => void confirm()}
    />
  );
}
