'use client';

import React, { useState } from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { formatBirthDate } from '@/features/onboarding/birthDate';
import type { UserResponse } from '@/lib/types';

import { EditProfile, type ProfileField } from './EditProfile';

/** The Name and Date of birth rows: each whole row opens the edit dialog on its field. */
export function ProfileEditRows({ user, today }: { user: UserResponse; today: string }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<ProfileField>('name');
  const show = (field: ProfileField) => {
    setFocus(field);
    setOpen(true);
  };
  return (
    <>
      <ListRow
        asChild
        title="Name"
        chevron
        trailing={
          <Text variant="body" tone="ink-2">
            {user.displayName?.trim() || 'Not set'}
          </Text>
        }
      >
        <button type="button" onClick={() => show('name')} />
      </ListRow>
      <ListRow
        asChild
        title="Date of birth"
        chevron
        trailing={
          <Text variant="body" tone="ink-2">
            <Conceal whole placeholder="••/••/••••">
              {formatBirthDate(user.birthDate) || 'Not set'}
            </Conceal>
          </Text>
        }
      >
        <button type="button" onClick={() => show('birth')} />
      </ListRow>
      <EditProfile user={user} today={today} open={open} focus={focus} onOpenChange={setOpen} />
    </>
  );
}
