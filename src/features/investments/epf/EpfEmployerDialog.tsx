'use client';

import React from 'react';

import { DateField, Dialog, DialogBody, DialogContent, showToast, TextField } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';

import type { EpfEmployer } from './epfModel';
import { useEpfMutations } from './useEpfMutations';

const FORM_ID = 'epf-employer-form';

export interface EpfEmployerDialogProps {
  /** The employer being edited; none adds one. */
  employer?: EpfEmployer | null;
  onClose: () => void;
  /** Called with the saved employer, before the dialog closes. */
  onSaved?: (employer: EpfEmployer) => void;
}

/** Adds or edits an employer: name, member ID and the dates of the job. Opened from the Employers card and the Employer dropdown. */
export function EpfEmployerDialog({ employer, onClose, onSaved }: EpfEmployerDialogProps) {
  const editing = Boolean(employer);
  const today = todayInAppZone();
  const mutations = useEpfMutations();
  const [name, setName] = React.useState(employer?.name ?? '');
  const [memberId, setMemberId] = React.useState(employer?.memberId ?? '');
  const [joinedOn, setJoinedOn] = React.useState(employer?.joinedOn ?? '');
  const [leftOn, setLeftOn] = React.useState(employer?.leftOn ?? '');
  const [error, setError] = React.useState<string | undefined>();
  const pending = mutations.createEmployer.isPending || mutations.updateEmployer.isPending;

  const submit = async () => {
    if (!name.trim()) {
      setError('Enter the employer name.');
      return;
    }
    const body = { name: name.trim(), memberId: memberId.trim() || null, joinedOn: joinedOn || null, leftOn: leftOn || null };
    try {
      const saved = employer
        ? await mutations.updateEmployer.mutateAsync({ id: employer.id, body })
        : await mutations.createEmployer.mutateAsync(body);
      showToast(editing ? 'Employer updated' : 'Employer added');
      await mutations.refresh();
      onSaved?.(saved);
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, editing ? "Couldn't update the employer. Try again." : "Couldn't add the employer. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title={editing ? 'Edit employer' : 'Add employer'}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: pending }}
        primary={{ label: editing ? 'Save employer' : 'Add employer', type: 'submit', form: FORM_ID, loading: pending }}
      >
        <DialogBody>
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
              error={error}
              onValueChange={(v) => {
                setName(v);
                setError(undefined);
              }}
            />
            <TextField
              label="Member ID"
              helper="Optional. On your payslip or passbook; a passbook import fills it."
              value={memberId}
              onValueChange={setMemberId}
            />
            <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
              <DateField label="Joined on" today={today} value={joinedOn} onValueChange={(v) => setJoinedOn(typeof v === 'string' ? v : '')} />
              <DateField label="Left on" today={today} value={leftOn} onValueChange={(v) => setLeftOn(typeof v === 'string' ? v : '')} />
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
