'use client';

import React, { useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { DateField } from '@/components/ds/DateField/DateField';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextField } from '@/components/ds/TextField/TextField';
import {
  BIRTH_CAPTION_GOOGLE,
  BIRTH_LABEL,
  birthDateFieldValue,
  MAX_NAME_LENGTH,
  NAME_CAPTION_GOOGLE,
  NAME_LABEL,
} from '@/features/onboarding/birthDate';
import { notify } from '@/lib/notify';
import type { UserResponse } from '@/lib/types';

import { updateProfile } from './editProfileActions';

/** The card's Edit action and its dialog (a bottom sheet on phone): the name and birth date banks lock statements with. */
export function EditProfile({ user, today }: { user: UserResponse; today: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = () => {
    setName(user.displayName ?? '');
    setBirth(birthDateFieldValue(user.birthDate));
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateProfile({ displayName: name.trim(), birthDate: birth });
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
      <Button variant="link" size="sm" onClick={show}>
        Edit
      </Button>
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
                label={NAME_LABEL}
                autoComplete="name"
                maxLength={MAX_NAME_LENGTH}
                value={name}
                onValueChange={setName}
                helper={user.hasPassword === false ? NAME_CAPTION_GOOGLE : undefined}
              />
              <DateField
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
