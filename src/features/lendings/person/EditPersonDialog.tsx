'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextArea } from '@/components/ds/TextArea/TextArea';
import { TextField } from '@/components/ds/TextField/TextField';
import type { CounterpartyResponse } from '@/lib/lending.types';

const FORM_ID = 'edit-person-form';

export interface EditPersonDialogProps {
  person: Pick<CounterpartyResponse, 'name' | 'notes'>;
  submitting: boolean;
  /** Resolves true when the person was saved. */
  onSubmit: (name: string, notes: string) => Promise<boolean>;
  onClose: () => void;
}

/** Name and notes of one person. */
export function EditPersonDialog({ person, submitting, onSubmit, onClose }: EditPersonDialogProps) {
  const [name, setName] = React.useState(person.name);
  const [notes, setNotes] = React.useState(person.notes ?? '');
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    if (await onSubmit(name, notes)) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title="Edit person details"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: 'Save person', type: 'submit', form: FORM_ID, loading: submitting }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextField
              label="Name"
              value={name}
              onValueChange={(v) => {
                setName(v);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <TextArea label="Notes" optional value={notes} onValueChange={setNotes} minRows={2} />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
