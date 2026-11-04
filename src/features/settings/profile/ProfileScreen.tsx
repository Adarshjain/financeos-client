import React from 'react';

import { logoutToDinero } from '@/actions/auth';
import { Button } from '@/components/ds/Button/Button';
import type { UserResponse } from '@/lib/types';

import { DeleteAccountCard } from './DeleteAccountCard';
import { ProfileCard } from './ProfileCard';

/** Profile: the profile card, then Sign out directly above the delete-account card. One column. */
export function ProfileScreen({ user }: { user: UserResponse }) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <ProfileCard user={user} />
      <form action={logoutToDinero}>
        <Button type="submit" variant="secondary" size="sm">
          Sign out
        </Button>
      </form>
      <DeleteAccountCard user={user} />
    </div>
  );
}
