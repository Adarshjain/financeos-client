'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { DateField } from '@/components/ds/DateField/DateField';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextField } from '@/components/ds/TextField/TextField';
import {
  BIRTH_CAPTION_GOOGLE,
  BIRTH_LABEL,
  birthDateFieldValue,
  isPartialBirthDate,
  MAX_NAME_LENGTH,
  NAME_CAPTION_GOOGLE,
  NAME_LABEL,
} from '@/features/onboarding/birthDate';
import { notify } from '@/lib/notify';
import type { UserResponse } from '@/lib/types';

import { updateProfile } from './editProfileActions';

export type ProfileField = 'name' | 'birth';

/** The edit dialog (a bottom sheet on phone) for the name and birth date banks lock statements with; the card's rows open it with one field focused. */
export function EditProfile({
  user,
  today,
  open,
  focus,
  onOpenChange,
}: {
  user: UserResponse;
  today: string;
  open: boolean;
  focus: ProfileField;
  onOpenChange: (open: boolean) => void;
}) {
  const setOpen = onOpenChange;
  const nameRef = useRef<HTMLInputElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh values each time it opens, then focus the tapped row's field once the dialog has mounted.
  useEffect(() => {
    if (!open) return;
    setName(user.displayName ?? '');
    setBirth(birthDateFieldValue(user.birthDate));
    setError(null);
    const t = setTimeout(() => (focus === 'birth' ? birthRef : nameRef).current?.focus(), 0);
    return () => clearTimeout(t);
    // Only on open: a saved user must not reset a half-typed edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    setSaving(true);
    setError(null);
    // A year-less stored date shows as an empty field; leaving it empty must not clear it.
    const keepsPartial = birth === '' && isPartialBirthDate(user.birthDate);
    const result = await updateProfile(
      keepsPartial ? { displayName: name.trim() } : { displayName: name.trim(), birthDate: birth },
    );
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOpen(false);
    notify.success('Profile saved');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <Dialog.Content
          size="sm"
          dismissible={!saving}
          title="Edit profile"
          secondary={{ label: 'Cancel', disabled: saving, onSelect: () => setOpen(false) }}
          primary={{ label: 'Save', loading: saving, disabled: saving, onSelect: save }}
        >
          <Dialog.Body>
            <form
              noValidate
              className="flex flex-col gap-space-12"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              {error ? <Banner tone="danger">{error}</Banner> : null}
              <TextField
                ref={nameRef}
                label={NAME_LABEL}
                autoComplete="name"
                maxLength={MAX_NAME_LENGTH}
                value={name}
                onValueChange={setName}
                helper={user.hasPassword === false ? NAME_CAPTION_GOOGLE : undefined}
              />
              <DateField
                ref={birthRef}
                label={BIRTH_LABEL}
                today={today}
                minDate="1900-01-01"
                maxDate={today}
                value={birth}
                onValueChange={(v) => setBirth(typeof v === 'string' ? v : '')}
                helper={user.birthDateSource === 'GOOGLE' && birth ? BIRTH_CAPTION_GOOGLE : undefined}
              />
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
