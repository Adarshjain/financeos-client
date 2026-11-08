'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';

import { ListRow } from '@/components/ds/ListRow/ListRow';

/** The Sign out row inside its form: it goes inactive from the press until the page moves on, so a second press does nothing. */
export function SignOutRow() {
  const { pending } = useFormStatus();
  return (
    <ListRow asChild title="Sign out" disabled={pending}>
      <button type="submit" disabled={pending} />
    </ListRow>
  );
}
