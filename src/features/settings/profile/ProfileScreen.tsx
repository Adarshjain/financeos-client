import React from 'react';

import { AppLockCard } from '@/features/appLock/AppLockCard';
import type { AppLockStatus } from '@/lib/api/types';
import type { UserResponse } from '@/lib/types';

import { AppearanceCard } from './AppearanceCard';
import { DeleteAccountCard } from './DeleteAccountCard';
import { ProfileCard } from './ProfileCard';

/** Profile & appearance: the profile, appearance and app lock cards beside the delete-account card. */
export function ProfileScreen({ user, appLock }: { user: UserResponse; appLock: AppLockStatus }) {
  return (
    <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
      <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
        <ProfileCard user={user} />
        <AppearanceCard />
        <AppLockCard status={appLock} />
      </div>
      <div className="desk:col-span-5">
        <DeleteAccountCard user={user} />
      </div>
    </div>
  );
}
