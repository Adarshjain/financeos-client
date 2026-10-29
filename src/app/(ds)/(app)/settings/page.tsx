import React from 'react';

import { ProfileScreen } from '@/features/settings/profile/ProfileScreen';
import { appLockApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Settings' };

export default async function DsSettingsProfilePage() {
  const user = await requireAuth();
  const appLock = await appLockApi.status();
  return <ProfileScreen user={user} appLock={appLock} />;
}
