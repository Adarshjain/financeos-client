import React from 'react';

import { AppLockCard } from '@/features/appLock/AppLockCard';
import { AppearanceCard } from '@/features/settings/profile/AppearanceCard';
import { DeleteAccountCard } from '@/features/settings/profile/DeleteAccountCard';
import { ProfileCard } from '@/features/settings/profile/ProfileCard';
import { appLockApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

export default async function DsSettingsProfilePage() {
  const user = await requireAuth();
  const appLock = await appLockApi.status();

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
